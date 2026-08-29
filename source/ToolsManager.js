const vscode = require('vscode');
const os     = require('os');
const fs     = require('fs');
const path   = require('path');
const Logger = require('./Logger');
const { spawn, spawnSync } = require('child_process');
const { OsTypes, CheckOs, FormatList, WrapSpacedComponents } = require('./CommonUtils');

/** @type {vscode.Disposable} */
let searchForToolsDisposable;

/**
 * Registers the 'searchForTools' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function SearchForToolsCommand(context)
{
    if (searchForToolsDisposable)
    {
        searchForToolsDisposable.dispose();
    }
    searchForToolsDisposable = vscode.commands.registerCommand("extension.searchForTools", SearchForTools);
    context.subscriptions.push(searchForToolsDisposable);
}

/**
 * Enum for build tools required
 */
const BuildTools =
{
    GCC   : 'gcc',
    GDB   : 'gdb',
    CMAKE : 'cmake',
    NINJA : 'ninja',
    SCOOP : 'scoop',
    GIT   : 'git',
};

/**
 * Enum for package managers
 */
const PackageManagers = 
{
    [OsTypes.WINDOWS] : 'scoop',
    [OsTypes.LINUX]   : 'apt-get',
    [OsTypes.MACOS]   : 'brew',
};

/**
 * Finds a tool on PATH using the platform-native lookup command.
 *
 * @param {string} toolName Name of the tool to search for
 *
 * @returns {string|undefined} absolute path of the resolved tool
 */
function findToolInPath(toolName)
{
    const lookupCommand = CheckOs() === OsTypes.WINDOWS ? 'where' : 'which';
    const lookup = spawnSync(lookupCommand, [toolName], { encoding: 'utf-8' });

    if (lookup.status !== 0 || !lookup.stdout)
    {
        return undefined;
    }

    return lookup.stdout
        .split(/\r?\n/)
        .map(eachLine => eachLine.trim())
        .find(eachLine => eachLine.length > 0);
}

/**
 * Returns the default Scoop installation locations that may contain a tool.
 *
 * @param {string} toolName Name of the tool to search for
 *
 * @returns {string[]} candidate absolute paths
 */
function getScoopToolCandidates(toolName)
{
    const scoopRoot = path.join(os.homedir(), 'scoop');

    /** @type {string[]} */
    const candidates =
    [
        path.join(scoopRoot, 'shims', `${toolName}.exe`),
        path.join(scoopRoot, 'shims', `${toolName}.cmd`),
        path.join(scoopRoot, 'shims', toolName),
        path.join(scoopRoot, 'apps', toolName, 'current', `${toolName}.exe`),
        path.join(scoopRoot, 'apps', toolName, 'current', 'bin', `${toolName}.exe`),
        path.join(scoopRoot, 'apps', toolName, 'current', 'usr', 'bin', `${toolName}.exe`),
    ];

    return candidates;
}

/**
 * Returns Scoop GCC package locations that may contain GCC-owned tools.
 *
 * @param {string} toolName Name of the tool to search for
 *
 * @returns {string[]} candidate absolute paths
 */
function getGccToolCandidates(toolName)
{
    const gccRoot = path.join(os.homedir(), 'scoop', 'apps', 'gcc', 'current');

    /** @type {string[]} */
    const candidates =
    [
        path.join(gccRoot, 'bin', `${toolName}.exe`),
        path.join(gccRoot, 'libexec', 'gcc', 'x86_64-w64-mingw32', `${toolName}.exe`),
    ];

    return candidates;
}

/**
 * Resolves the absolute executable path for a tool.
 *
 * @param {string} toolName Name of the tool to search for
 *
 * @returns {string|undefined} absolute path of the resolved tool
 */
function resolveToolPath(toolName)
{
    const toolInPath = findToolInPath(toolName);
    if (toolInPath)
    {
        return toolInPath;
    }

    if (CheckOs() !== OsTypes.WINDOWS)
    {
        return undefined;
    }

    const scoopCandidates = getScoopToolCandidates(toolName);
    const scoopCandidate = scoopCandidates.find(candidate => fs.existsSync(candidate));
    if (scoopCandidate)
    {
        return scoopCandidate;
    }

    const gccOwnedToolCandidate = getGccToolCandidates(toolName).find(candidate => fs.existsSync(candidate));
    if (gccOwnedToolCandidate)
    {
        return gccOwnedToolCandidate;
    }

    return undefined;
}

/**
 * Resolves a tool installed beside another executable, such as size.exe beside g++.exe.
 *
 * @param {string} toolName     Name of the tool to resolve
 * @param {string|undefined} referencePath Absolute path of the related executable
 * @returns {string|undefined} Matching tool path when present
 */
function resolveSiblingToolPath(toolName, referencePath)
{
    if (!referencePath)
    {
        return undefined;
    }

    const extension = CheckOs() === OsTypes.WINDOWS ? '.exe' : '';
    const candidate = path.join(path.dirname(referencePath), `${toolName}${extension}`);
    return fs.existsSync(candidate) ? candidate : undefined;
}

/**
 * Checks whether a resolved tool can actually be launched.
 *
 * @param {string} toolName  Name of the tool to search for
 * @param {string} toolPath  Resolved absolute path of the tool
 *
 * @returns {boolean} true if the tool can be executed
 */
function canExecuteTool(toolName, toolPath)
{
    if (toolName === BuildTools.SCOOP)
    {
        return fs.existsSync(toolPath);
    }

    const process = spawnSync(toolPath, ['--version'], { stdio: 'ignore' });

    return process.error === undefined && process.status === 0;
}

/**
 * Checks for the presence of a program using a resolved absolute path.
 * 
 * @param {string} toolName Name of the tool to search for
 * 
 * @returns {Promise<boolean>} true if the tool is present in PATH
 */
async function isToolInPath(toolName)
{
    const resolvedToolPath = resolveToolPath(toolName);
    if (!resolvedToolPath)
    {
        return false;
    }

    if (canExecuteTool(toolName, resolvedToolPath))
    {
        Logger.Info(`${resolvedToolPath} found.`);
        return true;
    }

    return false;
}

/**
 * Executes a Scoop installation command using PowerShell.
 * 
 * @returns {Promise<string>} A promise that resolves with a success message if the installation succeeds,
 * and rejects with an error if it fails.
 */
const installScoop = () => 
{
    Logger.Info('Attempting to install Scoop');

    const installCommand = 'powershell';
    const installArgs = ['-Command', '& {Set-ExecutionPolicy RemoteSigned -scope CurrentUser; iwr -useb get.scoop.sh | iex}'];

    return new Promise((resolve, reject) => 
    {
        const process = spawn(installCommand, installArgs);

        process.stdout.on('data', (data) => 
        {
            Logger.Info(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => 
        {
            Logger.Error(`stderr: ${data}`);
        });

        process.on('close', (code) => 
        {
            if (code !== 0)
            {
                reject(new Error(`Installation failed with code ${code}`));
            }
            else
            {
                resolve('Scoop was installed successfully');
            }
        });
    });
};

/**
 * Prompts the user for installing Scoop. If the user agrees, initiates the installation.
 * After installation, it either displays a success message or an error message based on the outcome.
 */
async function askAndInstallScoop()
{
    const toolName = BuildTools.SCOOP;
    vscode.window.showWarningMessage(`${toolName} not found. Would you like to install?`, 'Yes', 'No').then(selection =>
    {
        if (selection === 'Yes')
        {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${toolName}`,
                cancellable: false
            }, async (progress, token) => // eslint-disable-line no-unused-vars
            {
                progress.report({ message: `In Progress...` });
                try
                {
                    await installScoop();
                    progress.report({ message: `Finalizing...` });
                    askForRestart('Scoop was installed successfully');
                }
                catch (error)
                {
                    progress.report({ message: `Failed!` });
                    const message = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(message);
                }
                progress.report({ message: `Complete` });
            });
        }
        else if (selection === 'No')
        {
            Logger.Warning('Scoop was not found and the user did not consent to installation');
            vscode.window.showWarningMessage('Build tools for Windows would have to be installed manually.');
        }
    });
}

/**
 * Executes a specified command with provided arguments.
 * 
 * @param {string|undefined} userPassword Password provided by the user for tool installation.
 * @param {string}   command      The command to execute.
 * @param {string[]} args         The arguments for the command.
 * 
 * @returns {string} Stdout string if it passes.
 */
function execCommand(userPassword, command, args)
{
    if (command === 'scoop')
    {
        command = 'cmd';
        args = ['/c', `${WrapSpacedComponents(os.homedir())}\\scoop\\shims\\scoop`, ...args];
    }

    Logger.Info(`Executing: ${command} ${args.join(' ')}`);

    const process = spawnSync(command, args, { input: `${userPassword || ''}\n`, encoding: 'utf-8' });

    // Convert Buffer to String
    const stdout = process.stdout ? process.stdout.toString() : '';
    const stderr = process.stderr ? process.stderr.toString() : '';

    // Log the outputs
    if (stdout)
    {
        Logger.Info(`stdout: ${stdout}`);
    }

    if (stderr)
    {
        Logger.Error(`stderr: ${stderr}`);
    }

    if (process.status !== 0)
    {
        throw new Error(`Command failed with code ${process.status}`);
    }

    return stdout;
}

/**
 * Initiates the installation of a specified tool by using the appropriate tool manager.
 * 
 * @param {string}  toolName     The name of the tool to install.
 * @param {string|undefined} userPassword Password provided by the user for tool installation.
 * 
 * @returns {Thenable<boolean>} I don't know what this is. I miss C where bool is literally an int.
 */
function installTool(toolName, userPassword)
{
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${toolName}`,
        cancellable: false
    }, async (progress, token) => // eslint-disable-line no-unused-vars
    {
        Logger.Info(`Attempting to install ${toolName}`);

        let isInstalled = false;
        progress.report({ message: `In Progress...` });

        try
        {
            // Scoop installation has its own function.
            if (toolName === BuildTools.SCOOP) throw new Error("Scoop is not supposed to be installed from installTool() function");

            let installCommand = PackageManagers[CheckOs()] || null;
            if (installCommand === null) throw new Error('Unsupported OS type');

            /**
             * Since all 3 package managers use the same install command. If in future a
             * package manager changes, this logic would have to be changed as well.
             */
            const installArgs = ['install', toolName];

            // this has not been tested yet.
            if (installCommand === 'apt-get')
            {
                // sanity check
                if (userPassword === undefined) throw new Error('No password was provided to installTool while using apt.');

                installCommand = 'sudo';
                installArgs.unshift('apt-get');
                installArgs.unshift('-S');
                installArgs.push('-y');

                // in APT, 'ninja' is 'ninja-build'
                const indexOfNinja = installArgs.indexOf('ninja');
                if (indexOfNinja !== -1) installArgs[indexOfNinja] = 'ninja-build';
            }

            execCommand(userPassword, installCommand, installArgs);
            isInstalled = true;
            progress.report({ message: `Finalizing...` });
        }
        catch (error)
        {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(message);
        }

        return isInstalled;
    });
}

/**
 * Asks the user to restart VSCode. If user selects yes, it restarts.
 * 
 * @param {string} restartReason Reason for restart.
 */
function askForRestart(restartReason)
{
    vscode.window.showInformationMessage(`${restartReason}. Please restart VSCode.`, 'Yes', 'No').then(async (selection) =>
    {
        if (selection === 'Yes')
        {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        else if (selection === 'No')
        {
            // maybe show a warning message, but I think it is unnecessary
        }
    });
}

/**
 * Initiates the installation of each tool one by one. After the installation of all tools,
 * it asks the user if they want to restart VSCode. If allowed, it restarts VSCode. 
 * If any tools fail to install, it notifies the user about those tools.
 * 
 * @param {string[]} tools        An array containing names of the tools to install.
 * @param {string|undefined} userPassword Password provided by the user for tool installation.
 */
async function InstallMultipleTools(tools, userPassword)
{
    /** @type {string[]} */
    let installedTools = [];

    /** @type {Array<{tool: string, failReason: string}>} */
    let failedTools = [];

    for (let tool of tools)
    {
        try
        {
            let selection = await installTool(tool, userPassword);
            if (selection === true)
            {
                installedTools.push(tool);
            }
            else
            {
                throw new Error('This line should not have executed');
            }
        }
        catch (error)
        {
            let failReason = error instanceof Error ? error.message : String(error);
            failedTools.push({tool, failReason});
        }
    }

    processInstallationOutputs(installedTools, failedTools);
}

/**
 * For now, this strange logic handles the failed installation messages thrown by multiple failed
 * installations, while also showing the user why the individual installation failed.
 * 
 * @param {string[]} installedTools 
 * Array containing names of the tools for which installations passed.
 * 
 * @param {Array<{tool: string, failReason: string}>} failedTools 
 * Array containing names and fail reasons of tools for which installations failed.
 */
function processInstallationOutputs(installedTools, failedTools)
{
    if (failedTools.length > 0)
    {
        /** @type {string[]} */
        let failArray = [];
        for (let eachError of failedTools)
        {
            let errorStr = `${eachError.tool} (${eachError.failReason})`;
            failArray.push(errorStr);
        }
        const failedToolList = FormatList(failArray);
        vscode.window.showErrorMessage(`Failed to install: ${failedToolList}. Please install manually.`);
    }

    if (installedTools.length > 0)
    {
        const installedToolList = FormatList(installedTools);
        askForRestart(`${installedToolList} installation completed`);
    }
}

/**
 * Asks the user their sudo password to allow for tools installation.
 * 
 * @returns {Promise<string|undefined>} User's password
 */
async function askForPassword()
{
    // Ask the user about the project name
    let passwordAsker = await vscode.window.showInputBox({
        prompt     : 'Please enter your sudo password, it is required to to install the tools.',
        value      : undefined,
        placeHolder: 'your password',
        password   : true,
    });

    if (!passwordAsker)
    {
        vscode.window.showErrorMessage('Superuser access is required to install the missing tools.');
        return;
    }

    return passwordAsker;
}

/**
 * Prompts the user for installing a list of tools. If the user agrees, initiates the installation for each.
 * Displays a warning if the user declines, indicating the tools need to be manually installed.
 * 
 * @param {string[]} tools An array containing names of the tools to install.
 */
async function askAndInstallMultipleTools(tools)
{
    const toolList = FormatList(tools);

    const selection = await vscode.window.showWarningMessage(`${toolList} not found. Would you like to install?`, 'Yes', 'No');
    if (selection === 'Yes')
    {
        /** @type {string|undefined} */
        let userPassword = undefined;
        if (CheckOs() === OsTypes.LINUX)
        {
            userPassword = await askForPassword();
        }
        await InstallMultipleTools(tools, userPassword);
    }
    else
    {
        Logger.Warning(`${toolList} not found and the user did not consent to installation`);
        vscode.window.showWarningMessage(`${toolList} would have to be installed manually.`);
    }
}

/**
 * Searches for build tools and on Windows also for the package manager 'Scoop'.
 * Prompts the user for installing Scoop. If the user agrees, initiates the installation.
 * After installation, it either displays a success message or an error message based on the outcome.
 */
async function SearchForTools()
{
    /** @type {string[]} */
    let missingTools = [];

    if (CheckOs() === OsTypes.WINDOWS)
    {
        let scoop = await isToolInPath(BuildTools.SCOOP);
        if (scoop === false)
        {
            askAndInstallScoop();
            return;
        }
    }

    let toolsToCheck = [BuildTools.GCC, BuildTools.CMAKE, BuildTools.NINJA, BuildTools.GIT];
    if (CheckOs() !== OsTypes.MACOS) toolsToCheck.push(BuildTools.GDB);

    let results = await Promise.all(toolsToCheck.map(tool => isToolInPath(tool)));

    for (let i = 0; i < results.length; i++)
    {
        if (!results[i])
        {
            missingTools.push(toolsToCheck[i]);
        }
    }

    if (missingTools.length > 0)
    {
        await askAndInstallMultipleTools(missingTools);
    }
}

module.exports = 
{
    SearchForToolsCommand,
    SearchForTools,
    resolveToolPath,
    resolveSiblingToolPath
};
