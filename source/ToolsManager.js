const vscode = require('vscode');
const os     = require('os');
const utils  = require('./Utils');
const { spawn, spawnSync } = require('child_process');
const { execSync } = require('child_process');

/**
 * Enum for build tools required
 */
const BuildTools =
{
    GCC   : 'gcc',
    GDB   : 'gdb',
    CMAKE : 'cmake',
    NINJA : 'ninja',
    MAKE  : 'make',
    SCOOP : 'scoop',
    GIT   : 'git',
};

const PackageManagers = 
{
    [utils.OsTypes.WINDOWS] : 'scoop',
    [utils.OsTypes.LINUX]   : 'apt-get',
    [utils.OsTypes.MACOS]   : 'brew',
};

/**
 * Checks for the presence of a program by using the --version thingy
 * 
 * @param {string} toolName Name of the tool to search for
 * 
 * @returns {Promise<boolean>} true if the tool is present in PATH
 */
async function isToolInPath(toolName)
{
    toolName = toolName === BuildTools.SCOOP ? `${utils.WrapSpacedComponents(os.homedir())}\\scoop\\shims\\scoop` : toolName;
    

    try
    {
        execSync(versionCommand, { stdio: 'ignore' });
        return true;
    }
    catch (error)
    {
        return false;
    }
}

/**
 * Executes a Scoop installation command using PowerShell.
 * 
 * @returns {Promise<string>} A promise that resolves with a success message if the installation succeeds,
 * and rejects with an error if it fails.
 */
const installScoop = () => 
{
    const installCommand = 'powershell';
    const installArgs = ['-Command', '& {Set-ExecutionPolicy RemoteSigned -scope CurrentUser; iwr -useb get.scoop.sh | iex}'];

    return new Promise((resolve, reject) => 
    {
        const process = spawn(installCommand, installArgs);

        process.stdout.on('data', (data) => 
        {
            console.log(`installScoop - stdout: ${data}`);
        });

        process.stderr.on('data', (data) => 
        {
            console.error(`installScoop - stderr: ${data}`);
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
            }, async (progress, token) =>
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
                    vscode.window.showErrorMessage(error.message);
                }
                progress.report({ message: `Complete` });
            });
        }
        else if (selection === 'No')
        {
            vscode.window.showWarningMessage('Build tools for Windows would have to be installed manually.');
        }
    });
}

/**
 * Executes a specified command with provided arguments.
 * 
 * @param {string?}  userPassword Password provided by the user for tool installation.
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
        args = ['/c', `${utils.WrapSpacedComponents(os.homedir())}\\scoop\\shims\\scoop`, ...args];
    }

    console.log(`execCommand - Executing: ${command} ${args.join(' ')}`);

    const process = spawnSync(command, args, { input: Buffer.from(`${userPassword}\n`, "utf-8"), });

    // Convert Buffer to String
    const stdout = process.stdout ? process.stdout.toString() : '';
    const stderr = process.stderr ? process.stderr.toString() : '';

    // Log the outputs
    if (stdout)
    {
        console.log(`execCommand - stdout: ${stdout}`);
    }

    if (stderr)
    {
        console.error(`execCommand - stderr: ${stderr}`);
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
 * @param {string?} userPassword Password provided by the user for tool installation.
 * 
 * @returns {Thenable<boolean>} I don't know what this is. I miss C where bool is literally an int.
 */
function installTool(toolName, userPassword)
{
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${toolName}`,
        cancellable: false
    }, async (progress, token) =>
    {
        let isInstalled = false;
        progress.report({ message: `In Progress...` });

        try
        {
            // Scoop installation has its own function.
            if (toolName === BuildTools.SCOOP) throw new Error("Scoop is not supposed to be installed from installTool() function");

            let installCommand = PackageManagers[utils.CheckOs()] || null;
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
            throw new Error(error.message);
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
 * @param {string?}  userPassword Password provided by the user for tool installation.
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
            let failReason = `${error.message}`;
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
        const failedToolList = utils.FormatList(failArray);
        vscode.window.showErrorMessage(`Failed to install: ${failedToolList}. Please install manually.`);
    }

    if (installedTools.length > 0)
    {
        const installedToolList = utils.FormatList(installedTools);
        askForRestart(`${installedToolList} installation completed`);
    }
}

/**
 * Asks the user their sudo password to allow for tools installation.
 * 
 * @returns {Promise<string>} User's password
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
    const toolList = utils.FormatList(tools);
    vscode.window.showWarningMessage(`${toolList} not found. Would you like to install?`, 'Yes', 'No').then(async selection =>
    {
        if (selection === 'Yes')
        {
            /** @type {string} */
            let userPassword = undefined;
            if (utils.CheckOs() === utils.OsTypes.LINUX)
            {
                userPassword = await askForPassword();
            }
            InstallMultipleTools(tools, userPassword);
        }
        else if (selection === 'No')
        {
            vscode.window.showWarningMessage(`${toolList} would have to be installed manually.`);
        }
    });
}

/**
 * Prompts the user for installing Scoop. If the user agrees, initiates the installation.
 * After installation, it either displays a success message or an error message based on the outcome.
 */
async function searchForTools()
{
    /** @type {string[]} */
    let missingTools = [];

    if (utils.CheckOs() === utils.OsTypes.WINDOWS)
    {
        let scoop = await isToolInPath(BuildTools.SCOOP);
        if (scoop === false)
        {
            askAndInstallScoop();
            return;
        }
    }

    let toolsToCheck = [BuildTools.GCC, BuildTools.CMAKE, BuildTools.NINJA, BuildTools.MAKE, BuildTools.GIT];
    if (utils.CheckOs() !== utils.OsTypes.MACOS) 
    {
        toolsToCheck.push(BuildTools.GDB);
    }

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
        askAndInstallMultipleTools(missingTools);
    }
}

module.exports = 
{
    searchForTools,
};