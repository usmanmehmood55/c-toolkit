const vscode = require('vscode');
const os     = require('os');
const { exec, spawn, spawnSync } = require('child_process');

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
    SCOOP : 'scoop'
};

/**
 * Enum for OS types
 */
const OsTypes = 
{
    WINDOWS : 'windows',
    LINUX   : 'linux',
    MACOS   : 'macos',
};

const PackageManagers = 
{
    [OsTypes.WINDOWS] : 'scoop',
    [OsTypes.LINUX]   : 'apt-get',
    [OsTypes.MACOS]   : 'brew',
};

/**
 * Checks the OS type, if it is Windows, Linux or MacOS.
 * 
 * @returns {string} enum of OS Type
 */
function checkOs()
{
    switch (os.platform()) 
    {
    case 'win32':
        return OsTypes.WINDOWS;
    case 'darwin':
        return OsTypes.MACOS;
    case 'linux':
        return OsTypes.LINUX;
    default:
        throw new Error('Unsupported OS type');
    }
}

/**
 * Checks for the presence of a program by using the --version thingy
 * 
 * @param {string} toolName Name of the tool to search for
 * 
 * @returns {Promise<boolean>} true if the tool is present in PATH
 */
async function isToolInPath(toolName)
{
    toolName = toolName === BuildTools.SCOOP ? `${os.homedir()}\\scoop\\shims\\scoop` : toolName;
    return new Promise((resolve, reject) => 
    {
        exec(`${toolName} --version`, (error, stdout, stderr) => 
        {
            if (error) 
            {
                resolve(false);
            }
            else
            {
                resolve(true);
            }
            console.log(`error: ${error}, stdout: ${stdout}, stderr: ${stderr}`);
        });
    });
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
            console.log(`stdout: ${data}`);
        });

        process.stderr.on('data', (data) => 
        {
            console.error(`stderr: ${data}`);
        });

        process.on('close', (code) => 
        {
            if (code !== 0)
            {
                reject(new Error(`Installation failed with code ${code}`));
            }
            else
            {
                resolve('Scoop was installed successfully.');
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
    let toolName = BuildTools.SCOOP;
    vscode.window.showWarningMessage(`Would you like to install ${toolName}?`, 'Yes', 'No').then(selection =>
    {
        if (selection === 'Yes')
        {
            installScoop().then(successMessage =>
            {
                askForRestart(successMessage);
            }).catch(error =>
            {
                vscode.window.showErrorMessage(error.message);
            });
        }
        else if (selection === 'No')
        {
            // do nothing
        }
    });
}

/**
 * Executes a specified command with provided arguments.
 * 
 * @param {string} command The command to execute.
 * @param {string[]} args The arguments for the command.
 * 
 * @returns {string} Stdout string if it passes.
 */
function execCommand(command, args)
{
    if (command === 'scoop')
    {
        command = 'cmd';
        args = ['/c', 'scoop', ...args];
    }

    console.log(`Executing: ${command} ${args.join(' ')}`);
    const process = spawnSync(command, args);

    // Convert Buffer to String
    const stdout = process.stdout ? process.stdout.toString() : '';
    const stderr = process.stderr ? process.stderr.toString() : '';

    // Log the outputs
    if (stdout)
    {
        console.log(`stdout: ${stdout}`);
    }

    if (stderr)
    {
        console.error(`stderr: ${stderr}`);
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
 * @param {string} toolName The name of the tool to install.
 * 
 * @returns {Thenable<boolean>} I don't know what this is. I miss C where bool is literally an int.
 */
function installTool(toolName)
{
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${toolName}`,
        cancellable: false
    }, async (progress, token) =>
    {
        let isInstalled = false;
        progress.report({ message: `Starting...` });

        try
        {
            // Scoop installation has its own function.
            if (toolName === BuildTools.SCOOP) throw new Error("Scoop is not supposed to be installed from installTool() function");

            let installCommand = PackageManagers[checkOs()] || null;
            if (installCommand === null) throw new Error('Unsupported OS type');

            /**
             * Since all 3 package managers use the same install command. If in future a
             * package manager changes, this logic would have to be changed as well.
             */
            const installArgs = ['install', toolName];

            // this has not been tested yet.
            if (installCommand === 'apt-get') installArgs.unshift('sudo');

            execCommand(installCommand, installArgs);
            isInstalled = true;
            progress.report({ message: `Finalizing...` });
        }
        catch (error)
        {
            throw new Error(`Failed to install ${toolName}: ${error.message}`);
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
 * 
 * @param {string[]} tools An array containing names of the tools to install.
 */
function InstallMultipleTools(tools)
{
    let installedTools = [];
    for (let tool of tools)
    {
        if (installTool(tool)) installedTools.push(tool);
    }

    const installedToolList = installedTools.join(', ');
    askForRestart(`${installedToolList} installation completed`);
}

/**
 * Prompts the user for installing a list of tools. If the user agrees, it calls the InstallMultipleTools()
 * function.
 * 
 * @param {string[]} tools An array containing names of the tools to install.
 */
async function askAndInstallMultipleTools(tools)
{
    const toolList = tools.join(', ');
    vscode.window.showWarningMessage(`Would you like to install ${toolList}?`, 'Yes', 'No').then(async selection =>
    {
        if (selection === 'Yes')
        {
            InstallMultipleTools(tools);
        }
        else if (selection === 'No')
        {
            // do nothing
        }
    });
}

/**
 * Checks for the presence of a specified tool in the system's PATH.
 * If the tool is not found, it displays an error message.
 * 
 * @param {string} toolName The name of the tool to detect.
 * @returns {Promise<boolean>} A promise that resolves with true if the tool is detected, and false otherwise.
 */
async function detectTool(toolName)
{
    let toolFound = await isToolInPath(toolName);
    if (toolFound === false)
    {
        vscode.window.showErrorMessage(`${toolName} not found.`);
    }
    else
    {
        // vscode.window.showInformationMessage(`${toolName} found.`);
    }

    return toolFound;
}

/**
 * Checks for the presence of a set of predefined tools in the system.
 * For missing tools, it prompts the user for their installation.
 */
async function searchForTools()
{
    let missingTools = [];

    if (checkOs() === OsTypes.WINDOWS)
    {
        let scoop = await detectTool(BuildTools.SCOOP);
        if (scoop === false)
        {
            askAndInstallScoop();
            return;
        }
    }

    let results = await Promise.all
    ([
        detectTool(BuildTools.GCC),
        detectTool(BuildTools.GDB),
        detectTool(BuildTools.CMAKE),
        detectTool(BuildTools.NINJA),
        detectTool(BuildTools.MAKE)
    ]);

    const tools = [BuildTools.GCC, BuildTools.GDB, BuildTools.CMAKE, BuildTools.NINJA, BuildTools.MAKE];

    for (let i = 0; i < results.length; i++)
    {
        if (!results[i])
        {
            missingTools.push(tools[i]);
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