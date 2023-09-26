const vscode        = require('vscode');
const child_process = require('child_process');
const os            = require('os');
const { spawn }     = require('child_process');

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
        child_process.exec(`${toolName} --version`, (error, stdout, stderr) => 
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
                resolve('Scoop was installed successfully. Please close and reopen VSCode now.');
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
                vscode.window.showInformationMessage(successMessage);
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
 * @returns {Promise<string>} A promise that resolves with a success
 * message if the command executes successfully, and rejects with an 
 * error if it fails.
 */
function execCommand(command, args) 
{
    return new Promise((resolve, reject) => 
    {
        const process = spawn(command, args);

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
                reject(new Error(`Command failed with code ${code}`));
            } 
            else 
            {
                resolve(`Command executed successfully.`);
            }
        });
    });
}

/**
 * Initiates the installation of a specified tool. This is a placeholder function and needs a real implementation.
 * 
 * @param {string} toolName The name of the tool to install.
 */
async function installTool(toolName)
{
    vscode.window.showInformationMessage(`meep moop beep boop, installing ${toolName}`);

    if (toolName === BuildTools.SCOOP)
    {
        const errString = "Scoop is not supposed to be installed from installTool() function";
        vscode.window.showErrorMessage(errString);
        console.log(errString);
        throw new Error(errString);
    }

    let installCommand = null;
    switch (checkOs())
    {
    case OsTypes.WINDOWS:
        installCommand = 'scoop';
        break;
    case OsTypes.LINUX:
        installCommand = 'apt-get';
        break;
    case OsTypes.MACOS:
        installCommand = 'brew';
        break;
    default:
        installCommand = null;
        break;
    }

    if (installCommand === null) throw new Error('Unsupported OS type');

    const installArgs = ['install', toolName];

    if (installCommand === 'apt-get')
    {
        installArgs.unshift('sudo');
    }

    return execCommand(installCommand, installArgs);
}

/**
 * Prompts the user for installing a list of tools. If the user agrees, initiates the installation of each tool one by one.
 * After the installation of all tools, displays a success message.
 * 
 * @param {string[]} tools An array containing names of the tools to install.
 */
async function askAndInstallMultiple(tools)
{
    const toolList = tools.join(', ');
    vscode.window.showWarningMessage(`Would you like to install ${toolList}?`, 'Yes', 'No').then(async selection =>
    {
        if (selection === 'Yes')
        {
            for (let tool of tools)
            {
                await installTool(tool);
            }

            vscode.window.showInformationMessage(`${toolList} installation completed. Please restart VSCode. (This is a fake message, it was not installed.)`);
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
        askAndInstallMultiple(missingTools);
    }
}

module.exports = 
{
    searchForTools,
};