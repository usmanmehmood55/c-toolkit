const vscode   = require('vscode');
const fs       = require('fs');
const path     = require('path');

const RELEASE_BUILD    = 'Release';
const TEST_BUILD       = 'Test';
const DEBUG_BUILD      = 'Debug';

const BUILD_DIR_NAME    = 'build';
const BUILD_SCRIPT_NAME = 'CMakeLists.txt';

const BUILD_DIR_PATH    = path.join(vscode.workspace.rootPath, BUILD_DIR_NAME);
const CMAKE_LISTS_PATH  = path.join(vscode.workspace.rootPath, BUILD_SCRIPT_NAME);
const NATIVE_EXEC_PATH  = path.join(BUILD_DIR_PATH, `${vscode.workspace.name}.exe`);
const BUILD_MARKER_PATH = path.join(BUILD_DIR_PATH, 'z_build_complete_marker');

const BUILD_TERMINAL_NAME = "CMake Build";
const RUN_TERMINAL_NAME   = "CMake Run";

/**
 * Selects the build type between Release and Debug, and asks to perform a clean
 * build if teh type changes.
 * 
 * @param   {vscode.StatusBarItem} button
 * @param   {string}               buildType 
 * @returns {Promise<string>}      newBuildType
 */
async function selectBuild(button, buildType)
{
    // show a message that lets the user pick between build types
    let newBuildType = await vscode.window.showQuickPick([RELEASE_BUILD, DEBUG_BUILD]);

    // if no selection or the same selection, do not do anything
    if (!newBuildType || newBuildType === buildType)
    {
        return buildType;
    }

    // otherwise set buildType to newBuildType
    buildType = newBuildType;

    // set the button text to the new selection
    button.text = `$(gear) ${buildType}`;

    // Prompt the user to make a clean build after build type is changed
    await askNewBuild(buildType, 'Build type has changed. Do you want to make a clean build?');

    return buildType;
}

/**
 * Asks for a new build and performs the build if the user selects 'yes'.
 * 
 * @param {string} buildType Build type
 * @param {string} message   Message to display while asking for a new build
 */
async function askNewBuild(buildType, message) 
{
    let response = await vscode.window.showInformationMessage(message, 'Yes', 'No');
    if (response === 'Yes') 
    {
        await cleanBuild(true);
        await invokeBuild(buildType);
    }
}

/**
 * Cleans the build directory.
 * 
 * @param {boolean} is_silent does not display verbose messages if true
 */
async function cleanBuild(is_silent) 
{
    if (fs.existsSync(BUILD_DIR_PATH))
    {
        try 
        {
            fs.rmSync(BUILD_DIR_PATH, { recursive: true });
            if (!is_silent)
            {
                vscode.window.showInformationMessage('Build directory removed');
            }
        }
        catch (e)
        {
            vscode.window.showErrorMessage(`Failed to remove build directory: ${e}`);
        }
    }
    else
    {
        if (!is_silent)
        {
            vscode.window.showWarningMessage('Build directory does not exist');
        }
    }
}



/**
 * Invokes CMake to build, given the build type.
 * 
 * @param {string} buildType
 */
async function invokeBuild(buildType)
{
    const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;

    if (!workspaceRoot)
    {
        vscode.window.showInformationMessage("No workspace opened.");
        return;
    }

    if (!fs.existsSync(CMAKE_LISTS_PATH))
    {
        vscode.window.showInformationMessage("CMakeLists.txt not found.");
        return;
    }

    /**
     * The z_build_complete_marker is added in the end to give an indication of build process being complete.
     * I could not find any other way of signalling to the extension about the completion of build
     */
    let execString = `cmake -GNinja -Bbuild -DCMAKE_BUILD_TYPE=${buildType} ; ninja -C build ; touch ${BUILD_DIR_PATH}/z_build_complete_marker`;

    // Try to find an existing terminal named "Build Terminal"
    let terminal = vscode.window.terminals.find(t => t.name === BUILD_TERMINAL_NAME);

    // If no existing terminal is found, create a new one
    if (!terminal)
    {
        terminal = vscode.window.createTerminal(BUILD_TERMINAL_NAME);
    }

    // execute the command in the terminal
    terminal.sendText(execString);

    // show the terminal
    terminal.show();

    while(!fs.existsSync(BUILD_MARKER_PATH))
    {
        // wait until build has completed
    }
}



/**
 * Invokes a build and executes the application.
 * 
 * @param {string}  buildType    Build type (Release, Debug, Test)
 * @param {boolean} should_clean Cleans the build if true
 */
async function invokeRun(buildType, should_clean) 
{
    if (should_clean)
    {
        await cleanBuild(true);
    }

    await invokeBuild(buildType);

    if (fs.existsSync(NATIVE_EXEC_PATH))
    {
        let execString  = `${NATIVE_EXEC_PATH}`;

        // Try to find an existing terminal named "Tests Terminal"
        let terminal = vscode.window.terminals.find(t => t.name === RUN_TERMINAL_NAME);

        // If no existing terminal is found, create a new one
        if (!terminal) 
        {
            terminal = vscode.window.createTerminal(RUN_TERMINAL_NAME);
        }

        // execute the commands in the terminal
        terminal.sendText(execString);

        // show the terminal
        terminal.show();
    }
    else
    {
        vscode.window.showErrorMessage(`${NATIVE_EXEC_PATH} not found.`);
    }
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 * 
 * @param   {number} ms     Number of milliseconds to delay.
 * @returns {Promise<void>}
 */
async function delay(ms) 
{
    await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a test build and runs the test application.
 */
async function invokeTests() 
{
    invokeRun(TEST_BUILD, true);

    // Add a delay before executing the command. Adjust the time based on your average build and test time.
    await delay(3000);
    vscode.commands.executeCommand('gcov-viewer.reloadGcdaFiles');
}

/**
 * Starts a debug session for the application.
 * 
 * @param {string} buildType Release or Debug
 */
async function invokeDebug(buildType) 
{
    await cleanBuild(true);
    await invokeBuild(buildType);
    let debugProfileName = "c-toolkit launch";
    vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugProfileName);
}

module.exports = 
{
    selectBuild,
    cleanBuild,
    invokeBuild,
    invokeRun,
    invokeDebug,
    invokeTests,
};