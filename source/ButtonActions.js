const vscode = require('vscode');
const fs     = require('fs');
const path   = require('path');
const { OsTypes, CheckOs, WrapSpacedComponents } = require('./CommonUtils');

const BUILD_DIR_NAME      = 'build';
const CMAKE_LISTS_NAME    = 'CMakeLists.txt';
const BUILD_MARKER_NAME   = 'z_build_complete';
const BUILD_DIR_PATH      = path.join(vscode.workspace.rootPath, BUILD_DIR_NAME);
const CMAKE_LISTS_PATH    = path.join(vscode.workspace.rootPath, CMAKE_LISTS_NAME);
const BUILD_MARKER_PATH   = path.join(BUILD_DIR_PATH, BUILD_MARKER_NAME);
const EXECUTABLE_NAME     = `${vscode.workspace.name}${(CheckOs() === OsTypes.WINDOWS) ? '.exe' : ''}`;
const EXECUTABLE_PATH     = path.join(BUILD_DIR_PATH, EXECUTABLE_NAME);
const BUILD_TERMINAL_NAME = "CMake Build";
const RUN_TERMINAL_NAME   = "CMake Run";

const BuildTypes = 
{
    DEBUG   : 'Debug',
    TEST    : 'Test',
    RELEASE : 'Release',
};

const BuildSubsystems = 
{
    NINJA : 'ninja',
    MAKE  : 'make',
};

class BuildState
{
    /**
     * @param {string} type 
     * @param {string} subSystem
     */
    constructor(type, subSystem) 
    {
        this.type      = type;
        this.subSystem = subSystem;
    }
};

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
 * Asks for a new build and performs the build if the user selects 'yes'.
 * 
 * @param {BuildState} buildState Build state
 * @param {string}     message    Message to display while asking for a new build
 */
async function askNewBuild(buildState, message) 
{
    let response = await vscode.window.showInformationMessage(message, 'Yes', 'No');
    if (response === 'Yes') 
    {
        await cleanBuild(true);
        await invokeBuild(buildState);
    }
}

/**
 * Selects the build type between Release and Debug, and asks to perform a clean
 * build if teh type changes.
 * 
 * @param   {vscode.StatusBarItem} button
 * @param   {BuildState}           buildState 
 * @returns {Promise<BuildState>}  newBuildState
 */
async function selectBuild(button, buildState)
{
    // show a message that lets the user pick between build types
    let newBuildType = await vscode.window.showQuickPick([BuildTypes.DEBUG, BuildTypes.TEST, BuildTypes.RELEASE]);

    // if no selection or the same selection, do not do anything
    if (!newBuildType || newBuildType === buildState.type)
    {
        return buildState;
    }

    // otherwise set buildType to newBuildType
    buildState.type = newBuildType;

    // set the button text to the new selection
    button.text = `$(gear) ${buildState.type}`;

    // Prompt the user to make a clean build after build type is changed
    await askNewBuild(buildState, 'Build type has changed. Do you want to make a clean build?');

    return buildState;
}

/**
 * Selects the build type between Release and Debug, and asks to perform a clean
 * build if teh type changes.
 * 
 * @param   {vscode.StatusBarItem} button
 * @param   {BuildState}           buildState 
 * @returns {Promise<BuildState>}  newBuildSubsystem
 */
async function selectBuildSubsystem(button, buildState)
{
    let newBuildSubsystem = await vscode.window.showQuickPick([BuildSubsystems.NINJA, BuildSubsystems.MAKE]);

    // if no selection or the same selection, do not do anything
    if ((!newBuildSubsystem) || (newBuildSubsystem === buildState.subSystem))
    {
        return buildState;
    }

    // otherwise set buildType to newBuildType
    buildState.subSystem = newBuildSubsystem;

    // set the button text to the new selection
    button.text = `$(cpu) ${buildState.subSystem}`;

    // Prompt the user to make a clean build after build type is changed
    await askNewBuild(buildState, 'Build subsystem has changed. Do you want to make a clean build?');

    return buildState;
}

/**
 * Invokes CMake to build, given the build type.
 * 
 * @param {BuildState} buildState
 */
async function invokeBuild(buildState)
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

    if(fs.existsSync(BUILD_MARKER_PATH))
    {
        fs.rmSync(BUILD_MARKER_PATH);
    }

    /**
     * The z_build_complete_marker is added in the end to give an indication of build process being complete.
     * I could not find any other way of signalling to the extension about the completion of build.
     */
    const buildCommand    = `cmake -G Ninja -B ${BUILD_DIR_NAME} -D CMAKE_BUILD_TYPE=${buildState.type}`;
    const ninjaCommand    = 'ninja -C build';
    const buildMarker     = `touch ${WrapSpacedComponents(BUILD_MARKER_PATH)}`;
    const terminalSepChar = (CheckOs() === OsTypes.WINDOWS) ? ';' : '&&';

    const execString = `${buildCommand} ${terminalSepChar} ${ninjaCommand} ${terminalSepChar} ${buildMarker}`;

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

    /**
     * I am avoiding checking for presence the executable itself because I want it to continue
     * even if the build fails. If the build fails the executable would not be created and the
     * program would remain stuck on this while loop if I were to check for the executable.
     */
    while(!fs.existsSync(BUILD_MARKER_PATH))
    {
        // wait until build has completed
    }

    if (fs.existsSync(BUILD_MARKER_PATH)) fs.rmSync(BUILD_MARKER_PATH);

    delay(10); // wese hi
}

/**
 * Invokes a build and executes the application.
 * 
 * @param {BuildState} buildState  Build type (Release, Debug, Test)
 * @param {boolean}    shouldClean Cleans the build if true
 */
async function invokeRun(buildState, shouldClean) 
{
    if (shouldClean)
    {
        await cleanBuild(true);
    }

    await invokeBuild(buildState);

    if (fs.existsSync(EXECUTABLE_PATH))
    {
        const execString  = WrapSpacedComponents(EXECUTABLE_PATH);

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
        vscode.window.showErrorMessage(`${EXECUTABLE_PATH} not found.`);
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
 * @param {BuildState} buildState 
 */
async function invokeTests(buildState) 
{
    buildState.type = BuildTypes.TEST;
    invokeRun(buildState, true);

    // Add a delay before executing the command. Adjust the time based on your average build and test time.
    await delay(3000);
    vscode.commands.executeCommand('gcov-viewer.reloadGcdaFiles');
}

/**
 * Starts a debug session for the application.
 * 
 * @param {BuildState} buildState Release or Debug
 */
async function invokeDebug(buildState) 
{
    await cleanBuild(true);
    await invokeBuild(buildState);
    let debugProfileName = "c-toolkit launch";
    vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugProfileName);
}

module.exports = 
{
    BuildState,
    BuildTypes,
    BuildSubsystems,
    selectBuild,
    selectBuildSubsystem,
    cleanBuild,
    invokeBuild,
    invokeRun,
    invokeDebug,
    invokeTests,
};