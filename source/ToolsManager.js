const vscode        = require('vscode');
const child_process = require('child_process');

const GCC_NAME   = 'gcc';
const GDB_NAME   = 'gdb';
const CMAKE_NAME = 'cmake';
const NINJA_NAME = 'ninja';

/**
 * Checks for the presence of a program by using the --version thingy
 * 
 * @param {string} toolName Name of the tool to search for
 * 
 * @returns {Promise<boolean>} true if the tool is present in PATH
 */
async function isToolInPath(toolName)
{
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
 * Checks for the presence of a tool and displays an error if the tool
 * is not found
 * 
 * @param {string} toolName Name of the tool to search for
 */
async function detectTool(toolName)
{
    let toolFound = await isToolInPath(toolName);
    if (toolFound === false)
    {
        vscode.window.showErrorMessage(`${toolName} not found, Please install it and add it to PATH.`);
    }
    else
    {
        // vscode.window.showInformationMessage(`${toolName} found.`);
    }
}

/**
 * Invokes CMake to build, given the build type.
 */
async function searchForTools()
{
    detectTool(GCC_NAME)
    detectTool(GDB_NAME)
    detectTool(CMAKE_NAME);
    detectTool(NINJA_NAME);
}

module.exports = 
{
    searchForTools,
};