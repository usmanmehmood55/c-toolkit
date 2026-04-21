const vscode = require('vscode');
const fs     = require('fs');
const path   = require('path');
const { OsTypes, CheckOs, GetWorkspacePath } = require('./CommonUtils');
const { IsProjectCpp } = require('./ProjectManager');
const { resolveToolPath } = require('./ToolsManager');

const BUILD_DIR_NAME      = 'build';
const CMAKE_LISTS_NAME    = 'CMakeLists.txt';
const BUILD_TASK_NAME     = "CMake Build";
const RUN_TASK_NAME       = "CMake Run";
const TEST_TASK_NAME      = "CMake Test";

/** @type {string} */
let BUILD_DIR_PATH    = undefined;
/** @type {string} */
let CMAKE_LISTS_PATH  = undefined;
/** @type {string} */
let EXECUTABLE_NAME   = undefined;
/** @type {string} */
let EXECUTABLE_PATH   = undefined;

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

/**
 * Keeps the selected build configuration together.
 */
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
 * Synchronizes the paths used by the extension with the current workspace.
 * It sets global path variables to their correct values based on the current workspace's root.
 * This function is called before operations that require the workspace paths.
 * 
 * @returns {boolean}
 * True if the workspace path is successfully determined and the global paths are set;
 * undefined if no workspace is open, in which case an error message is displayed to the user.
 */
function syncPaths()
{
    let workspacePath = GetWorkspacePath();
    if (!workspacePath)
    {
        vscode.window.showErrorMessage("No folder open in the workspace");
        return undefined;
    }

    BUILD_DIR_PATH      = path.join(workspacePath, BUILD_DIR_NAME);
    CMAKE_LISTS_PATH    = path.join(workspacePath, CMAKE_LISTS_NAME);
    EXECUTABLE_NAME     = `${vscode.workspace.name}${(CheckOs() === OsTypes.WINDOWS) ? '.exe' : ''}`;
    EXECUTABLE_PATH     = path.join(BUILD_DIR_PATH, EXECUTABLE_NAME);

    return true;
}

/**
 * Cleans the build directory.
 * 
 * @param {boolean} is_silent does not display verbose messages if true
 */
async function cleanBuild(is_silent) 
{
    if (!syncPaths()) return;

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
    if (!syncPaths()) return;

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
    /** @type {string?} */
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
 * @returns {Promise<boolean>}
 */
async function invokeBuild(buildState)
{
    if (!syncPaths()) return;

    const workspaceRoot = GetWorkspacePath();

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

    const compilerArgs = getCompilerArgs();
    if (compilerArgs === undefined)
    {
        return false;
    }

    const configureArgs =
    [
        '-G', 'Ninja',
        '-B', BUILD_DIR_NAME,
        '-D', `CMAKE_BUILD_TYPE=${buildState.type}`,
        ...compilerArgs
    ];
    const buildArgs = ['--build', BUILD_DIR_NAME];

    try
    {
        await executeProcessTask(BUILD_TASK_NAME, 'cmake', configureArgs, workspaceRoot);
        await executeProcessTask(BUILD_TASK_NAME, 'cmake', buildArgs, workspaceRoot);
        return true;
    }
    catch (error)
    {
        vscode.window.showErrorMessage(`Build failed: ${error.message}`);
        return false;
    }
}

/**
 * Resolves compiler paths and maps them to CMake configure arguments.
 *
 * @returns {string[]|undefined} compiler-related configure arguments
 */
function getCompilerArgs()
{
    const isCpp = IsProjectCpp();
    if (isCpp === undefined)
    {
        vscode.window.showErrorMessage('Unable to determine whether the project is C or C++.');
        return undefined;
    }

    const cCompilerPath = resolveToolPath('gcc');
    if (!cCompilerPath)
    {
        vscode.window.showErrorMessage('Unable to resolve gcc for the current environment.');
        return undefined;
    }

    /** @type {string[]} */
    const compilerArgs = ['-D', `CMAKE_C_COMPILER=${cCompilerPath}`];

    if (isCpp)
    {
        const cppCompilerPath = resolveToolPath('g++');
        if (!cppCompilerPath)
        {
            vscode.window.showErrorMessage('Unable to resolve g++ for the current environment.');
            return undefined;
        }

        compilerArgs.push('-D', `CMAKE_CXX_COMPILER=${cppCompilerPath}`);
    }

    return compilerArgs;
}

/**
 * Invokes a build and executes the application.
 * 
 * @param {BuildState} buildState  Build type (Release, Debug, Test)
 * @param {boolean}    shouldClean Cleans the build if true
 * @param {string}     taskName    Task name used to run the executable
 * @returns {Promise<boolean>}
 */
async function invokeRun(buildState, shouldClean, taskName = RUN_TASK_NAME) 
{
    if (!syncPaths()) return;

    if (shouldClean)
    {
        await cleanBuild(true);
    }

    const didBuild = await invokeBuild(buildState);
    if (!didBuild)
    {
        return false;
    }

    if (fs.existsSync(EXECUTABLE_PATH))
    {
        try
        {
            await executeProcessTask(taskName, EXECUTABLE_PATH, [], BUILD_DIR_PATH);
            return true;
        }
        catch (error)
        {
            vscode.window.showErrorMessage(`Execution failed: ${error.message}`);
            return false;
        }
    }

    vscode.window.showErrorMessage(`${EXECUTABLE_PATH} not found.`);
    return false;
}

/**
 * Runs a process as a VS Code task and resolves when it exits.
 *
 * @param {string}   taskName Task label shown in the task UI.
 * @param {string}   command  Executable name or absolute path.
 * @param {string[]} args     Process arguments.
 * @param {string}   cwd      Working directory.
 * @returns {Promise<void>}
 */
async function executeProcessTask(taskName, command, args, cwd)
{
    const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!workspaceFolder)
    {
        throw new Error('No folder open in the workspace');
    }

    const execution = new vscode.ProcessExecution(command, args, { cwd, env: getToolRuntimeEnvironment() });
    const task = new vscode.Task({ type: 'c-toolkit' }, workspaceFolder, taskName, 'c-toolkit', execution);
    task.presentationOptions =
    {
        reveal: vscode.TaskRevealKind.Always,
        panel : vscode.TaskPanelKind.Dedicated,
        clear : false,
        focus : false,
    };

    return new Promise((resolve, reject) =>
    {
        /** @type {vscode.TaskExecution | undefined} */
        let runningTask = undefined;
        /** @type {{exitCode: number|undefined}|undefined} */
        let pendingTaskResult = undefined;
        const disposable = vscode.tasks.onDidEndTaskProcess(event =>
        {
            if (event.execution.task.name !== task.name || event.execution.task.source !== task.source)
            {
                return;
            }

            if (runningTask === undefined)
            {
                pendingTaskResult = { exitCode: event.exitCode };
                return;
            }

            disposable.dispose();

            if (event.exitCode === 0)
            {
                resolve();
            }
            else
            {
                reject(new Error(`${taskName} exited with code ${event.exitCode}`));
            }
        });

        vscode.tasks.executeTask(task).then(executionResult =>
        {
            runningTask = executionResult;
            if (pendingTaskResult !== undefined)
            {
                disposable.dispose();

                if (pendingTaskResult.exitCode === 0)
                {
                    resolve();
                }
                else
                {
                    reject(new Error(`${taskName} exited with code ${pendingTaskResult.exitCode}`));
                }
            }
        }, error =>
        {
            disposable.dispose();
            reject(error);
        });
    });
}

/**
 * Builds an environment for task execution that includes resolved tool directories.
 *
 * @returns {NodeJS.ProcessEnv} environment for tool execution
 */
function getToolRuntimeEnvironment()
{
    /** @type {NodeJS.ProcessEnv} */
    const env = { ...process.env };
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'Path';
    const existingPath = env[pathKey] || '';

    /** @type {string[]} */
    const toolDirectories =
    [
        resolveToolPath('gcc'),
        resolveToolPath('g++'),
        resolveToolPath('size'),
        resolveToolPath('gdb'),
        resolveToolPath('cmake'),
        resolveToolPath('ninja'),
        resolveToolPath('make'),
    ]
        .filter(eachPath => typeof eachPath === 'string')
        .map(eachPath => path.dirname(eachPath));

    const uniqueDirectories = [...new Set(toolDirectories)];
    env[pathKey] = [...uniqueDirectories, existingPath].filter(Boolean).join(path.delimiter);

    return env;
}

/**
 * Creates a test build and runs the test application.
 * @param {BuildState} buildState 
 * @returns {Promise<boolean>}
 */
async function invokeTests(buildState) 
{
    if (!syncPaths()) return;

    const testBuildState = new BuildState(BuildTypes.TEST, buildState.subSystem);
    const didRun = await invokeRun(testBuildState, true, TEST_TASK_NAME);
    if (!didRun)
    {
        return false;
    }

    await vscode.commands.executeCommand('gcov-viewer.reloadGcdaFiles');
    return true;
}

/**
 * Starts a debug session for the application.
 * 
 * @param {BuildState} buildState Release or Debug
 * @returns {Promise<boolean>}
 */
async function invokeDebug(buildState) 
{
    if (!syncPaths()) return;

    await cleanBuild(true);
    const didBuild = await invokeBuild(buildState);
    if (!didBuild)
    {
        return false;
    }

    let debugProfileName = "c-toolkit launch";
    return vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugProfileName);
}

/**
 * Builds the test configuration and starts a debug session for it.
 * 
 * @param {BuildState} buildState Release or Debug
 * @returns {Promise<boolean>}
 */
async function invokeDebugTest(buildState)
{
    if (!syncPaths()) return;

    const testBuildState = new BuildState(BuildTypes.TEST, buildState.subSystem);
    return invokeDebug(testBuildState);
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
    invokeDebugTest,
    invokeTests,
};
