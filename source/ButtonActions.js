const vscode = require('vscode');
const fs     = require('fs');
const path   = require('path');
const { spawn } = require('child_process');
const { OsTypes, CheckOs, SelectWorkspaceFolder } = require('./CommonUtils');
const { IsProjectCpp } = require('./ProjectManager');
const { resolveToolPath, resolveSiblingToolPath } = require('./ToolsManager');
const { BuildReporter } = require('./BuildReporter');

const BUILD_DIR_NAME      = 'build';
const CMAKE_LISTS_NAME    = 'CMakeLists.txt';
const RUN_TASK_NAME       = "CMake Run";
const TEST_TASK_NAME      = "CMake Test";

/** @type {string} */
let BUILD_DIR_PATH    = '';
/** @type {string} */
let CMAKE_LISTS_PATH  = '';
/** @type {string} */
let EXECUTABLE_NAME   = '';
/** @type {string} */
let EXECUTABLE_PATH   = '';
/** @type {vscode.Terminal|undefined} */
let RUN_TERMINAL      = undefined;
/** @type {vscode.WorkspaceFolder|undefined} */
let ACTIVE_WORKSPACE_FOLDER = undefined;
/** @type {Map<string, string>} */
const SELECTED_TARGETS = new Map();

const BuildTypes = 
{
    DEBUG   : 'Debug',
    TEST    : 'Test',
    RELEASE : 'Release',
};

/**
 * Keeps the selected build configuration together.
 */
class BuildState
{
    /**
     * @param {string} type 
     */
    constructor(type)
    {
        this.type = type;
    }
};

/**
 * Synchronizes the paths used by the extension with the current workspace.
 * It sets global path variables to their correct values based on the current workspace's root.
 * This function is called before operations that require the workspace paths.
 * 
 * @returns {Promise<boolean>}
 * True if the workspace path is successfully determined and the global paths are set;
 * undefined if no workspace is open, in which case an error message is displayed to the user.
 */
async function syncPaths()
{
    const workspaceFolder = await SelectWorkspaceFolder();
    if (!workspaceFolder)
    {
        vscode.window.showErrorMessage("No folder open in the workspace");
        return false;
    }

    ACTIVE_WORKSPACE_FOLDER = workspaceFolder;
    const workspacePath = workspaceFolder.uri.fsPath;
    BUILD_DIR_PATH      = path.join(workspacePath, BUILD_DIR_NAME);
    CMAKE_LISTS_PATH    = path.join(workspacePath, CMAKE_LISTS_NAME);
    EXECUTABLE_NAME     = `${workspaceFolder.name}${(CheckOs() === OsTypes.WINDOWS) ? '.exe' : ''}`;
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
    if (!await syncPaths()) return;

    if (fs.existsSync(BUILD_DIR_PATH))
    {
        try 
        {
            await fs.promises.rm(BUILD_DIR_PATH, { recursive: true });
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
    if (!await syncPaths()) return;

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
 * Invokes CMake to build, given the build type.
 * 
 * @param {BuildState} buildState
 * @returns {Promise<boolean>}
 */
async function invokeBuild(buildState)
{
    if (!await syncPaths()) return false;

    const workspaceRoot = ACTIVE_WORKSPACE_FOLDER && ACTIVE_WORKSPACE_FOLDER.uri.fsPath;

    if (!workspaceRoot)
    {
        vscode.window.showInformationMessage("No workspace opened.");
        return false;
    }

    if (!fs.existsSync(CMAKE_LISTS_PATH))
    {
        vscode.window.showInformationMessage("CMakeLists.txt not found.");
        return false;
    }

    const compilerArgs = getCompilerArgs(workspaceRoot);
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

    BuildReporter.Start(`Build · ${buildState.type}`);
    BuildReporter.Pass('CMakeLists.txt found');

    let failedStage = '';
    let failureMessage = '';
    const didBuild = await vscode.window.withProgress({
        location   : vscode.ProgressLocation.Notification,
        title      : `C C++ Toolkit · ${buildState.type}`,
        cancellable: true,
    }, async (progress, token) =>
    {
        let activeStage = 'CMake generation';
        try
        {
            BuildReporter.Active('Generating with CMake');
            progress.report({ message: 'Generating with CMake…' });
            await prepareCMakeFileApiQuery();
            await executeBuildProcess('cmake', configureArgs, workspaceRoot, token);
            BuildReporter.Pass('Generated with CMake');

            activeStage = 'Ninja compilation';
            BuildReporter.Active('Compiling with Ninja');
            progress.report({ message: 'Compiling with Ninja…' });
            await executeBuildProcess('cmake', buildArgs, workspaceRoot, token);
            BuildReporter.Pass('Compiled with Ninja');
            await selectExecutableTarget();
            return true;
        }
        catch (error)
        {
            failureMessage = error instanceof Error ? error.message : String(error);
            failedStage = activeStage;
            BuildReporter.Fail(`${activeStage} failed`);
            return false;
        }
    });

    if (didBuild)
    {
        vscode.window.setStatusBarMessage(`$(check) ${buildState.type} build complete`, 5000);
        vscode.window.showInformationMessage(`${buildState.type} build completed successfully.`);
        return true;
    }

    vscode.window.showErrorMessage(`${failedStage} failed: ${failureMessage}`, 'Show Details').then(action =>
    {
        if (action === 'Show Details')
        {
            BuildReporter.Show();
        }
    });
    return false;
}

/**
 * Resolves compiler paths and maps them to CMake configure arguments.
 *
 * @returns {string[]|undefined} compiler-related configure arguments
 * @param {string} workspaceRoot Selected workspace root.
 */
function getCompilerArgs(workspaceRoot)
{
    const isCpp = IsProjectCpp(workspaceRoot);
    if (isCpp === undefined)
    {
        vscode.window.showErrorMessage('Unable to determine whether the project is C or C++.');
        return undefined;
    }

    /** @type {string[]} */
    const compilerArgs = [];
    let activeCompilerPath;

    if (isCpp)
    {
        const cppCompilerPath = resolveToolPath('g++');
        if (!cppCompilerPath)
        {
            vscode.window.showErrorMessage('Unable to resolve g++ for the current environment.');
            return undefined;
        }

        compilerArgs.push('-D', `CMAKE_CXX_COMPILER=${cppCompilerPath}`);
        activeCompilerPath = cppCompilerPath;
    }
    else
    {
        const cCompilerPath = resolveToolPath('gcc');
        if (!cCompilerPath)
        {
            vscode.window.showErrorMessage('Unable to resolve gcc for the current environment.');
            return undefined;
        }

        compilerArgs.push('-D', `CMAKE_C_COMPILER=${cCompilerPath}`);
        activeCompilerPath = cCompilerPath;
    }

    const sizePath = resolveSiblingToolPath('size', activeCompilerPath);
    if (sizePath)
    {
        compilerArgs.push('-D', `CMAKE_SIZE=${sizePath}`);
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
    if (!await syncPaths()) return false;

    if (shouldClean)
    {
        await cleanBuild(true);
    }

    const didBuild = await invokeBuild(buildState);
    if (!didBuild)
    {
        return false;
    }

    if (await fileExists(EXECUTABLE_PATH))
    {
        try
        {
            BuildReporter.Active(taskName === TEST_TASK_NAME ? 'Running tests' : 'Starting application');
            const shouldWait = taskName === TEST_TASK_NAME;
            const didRun = await launchExecutableTerminal(taskName, EXECUTABLE_PATH, BUILD_DIR_PATH, shouldWait);
            if (didRun)
            {
                BuildReporter.Pass(taskName === TEST_TASK_NAME ? 'Tests completed' : 'Application started');
            }
            return didRun;
        }
        catch (error)
        {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Execution failed: ${message}`);
            return false;
        }
    }

    vscode.window.showErrorMessage(`${EXECUTABLE_PATH} not found.`);
    return false;
}

/**
 * Runs a build process without exposing an implementation terminal.
 *
 * @param {string}   command  Executable name or absolute path.
 * @param {string[]} args     Process arguments.
 * @param {string}   cwd      Working directory.
 * @param {vscode.CancellationToken|undefined} cancellationToken Build cancellation token.
 * @returns {Promise<void>}
 */
async function executeBuildProcess(command, args, cwd, cancellationToken)
{
    const executable = resolveToolPath(command) || command;
    BuildReporter.Command(executable, args);

    return new Promise((resolve, reject) =>
    {
        const process = spawn(executable, args, { cwd, env: getToolRuntimeEnvironment() });
        let capturedOutput = '';
        let settled = false;
        const cancellation = cancellationToken && cancellationToken.onCancellationRequested(() =>
        {
            terminateProcessTree(process.pid);
        });

        process.stdout.on('data', data =>
        {
            const output = data.toString();
            capturedOutput += output;
            BuildReporter.Output(output);
        });

        process.stderr.on('data', data =>
        {
            const output = data.toString();
            capturedOutput += output;
            BuildReporter.Output(output);
        });

        process.on('error', error =>
        {
            if (settled) return;
            settled = true;
            if (cancellation) cancellation.dispose();
            reject(error);
        });

        process.on('close', code =>
        {
            if (settled) return;
            settled = true;
            if (cancellation) cancellation.dispose();
            if (cancellationToken && cancellationToken.isCancellationRequested)
            {
                reject(new Error('Build cancelled'));
                return;
            }
            if (code === 0)
            {
                resolve();
                return;
            }

            BuildReporter.FailureOutput(capturedOutput);
            reject(new Error(`${path.basename(executable)} exited with code ${code}`));
        });
    });
}

/**
 * Launches the compiled program in a clean, interactive terminal.
 *
 * @param {string}  name        Terminal name.
 * @param {string}  executable  Executable path.
 * @param {string}  cwd         Working directory.
 * @param {boolean} waitForExit Whether completion must wait for the terminal to close.
 * @returns {Promise<boolean>} Whether the program launched or exited successfully.
 */
async function launchExecutableTerminal(name, executable, cwd, waitForExit)
{
    if (!waitForExit)
    {
        if (RUN_TERMINAL)
        {
            RUN_TERMINAL.dispose();
        }

        RUN_TERMINAL = vscode.window.createTerminal({
            name: 'C C++ Toolkit: Run',
            cwd,
            env : getToolRuntimeEnvironment(),
        });
        RUN_TERMINAL.show(false);
        RUN_TERMINAL.sendText(formatTerminalCommand(executable));
        return true;
    }

    const terminal = vscode.window.createTerminal({ name, shellPath: executable, cwd });
    terminal.show(false);
    return new Promise(resolve =>
    {
        const disposable = vscode.window.onDidCloseTerminal(closedTerminal =>
        {
            if (closedTerminal === terminal)
            {
                disposable.dispose();
                resolve(terminal.exitStatus !== undefined && terminal.exitStatus.code === 0);
            }
        });
    });
}

/**
 * Formats an executable path for the user's platform shell.
 *
 * @param {string} executable Executable path.
 * @returns {string} Shell command.
 */
function formatTerminalCommand(executable)
{
    if (CheckOs() === OsTypes.WINDOWS)
    {
        return `& "${executable.replace(/"/g, '`"')}"`;
    }

    return `'${executable.replace(/'/g, `'\\''`)}'`;
}

/**
 * Builds an environment for task execution that includes resolved tool directories.
 *
 * @returns {{[key: string]: string}} environment for tool execution
 */
function getToolRuntimeEnvironment()
{
    /** @type {{[key: string]: string}} */
    const env = {};
    for (const [key, value] of Object.entries(process.env))
    {
        if (value !== undefined)
        {
            env[key] = value;
        }
    }
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'Path';
    const existingPath = env[pathKey] || '';

    const isCpp = IsProjectCpp(ACTIVE_WORKSPACE_FOLDER && ACTIVE_WORKSPACE_FOLDER.uri.fsPath);
    const activeCompilerPath = resolveToolPath(isCpp ? 'g++' : 'gcc');
    const matchingSizePath = resolveSiblingToolPath('size', activeCompilerPath);

    const toolPaths =
    [
        matchingSizePath,
        activeCompilerPath,
        resolveToolPath('gcc'),
        resolveToolPath('g++'),
        resolveToolPath('size'),
        resolveToolPath('gdb'),
        resolveToolPath('cmake'),
        resolveToolPath('ninja'),
    ];

    /** @type {string[]} */
    const toolDirectories = [];
    for (const eachPath of toolPaths)
    {
        if (eachPath !== undefined)
        {
            toolDirectories.push(path.dirname(eachPath));
        }
    }

    const uniqueDirectories = [...new Set(toolDirectories)];
    env[pathKey] = [...uniqueDirectories, existingPath].filter(Boolean).join(path.delimiter);

    return env;
}

/** @returns {Promise<void>} Creates the CMake File API target query. */
async function prepareCMakeFileApiQuery()
{
    const queryFolder = path.join(BUILD_DIR_PATH, '.cmake', 'api', 'v1', 'query');
    await fs.promises.mkdir(queryFolder, { recursive: true });
    await fs.promises.writeFile(path.join(queryFolder, 'codemodel-v2'), '');
}

/** Updates the active executable from CMake's generated target metadata. */
async function selectExecutableTarget()
{
    const replyFolder = path.join(BUILD_DIR_PATH, '.cmake', 'api', 'v1', 'reply');
    let replyFiles;
    try
    {
        replyFiles = await fs.promises.readdir(replyFolder);
    }
    catch (error)
    {
        return;
    }

    const indexFile = replyFiles.filter(file => file.startsWith('index-') && file.endsWith('.json')).sort().pop();
    if (!indexFile) return;

    const index = JSON.parse(await fs.promises.readFile(path.join(replyFolder, indexFile), 'utf8'));
    const codemodelFile = index.reply && index.reply['codemodel-v2'] && index.reply['codemodel-v2'].jsonFile;
    if (!codemodelFile) return;

    const codemodel = JSON.parse(await fs.promises.readFile(path.join(replyFolder, codemodelFile), 'utf8'));
    const targets = (codemodel.configurations && codemodel.configurations[0] && codemodel.configurations[0].targets) || [];
    const executables = [];
    for (const targetReference of targets)
    {
        const target = JSON.parse(await fs.promises.readFile(path.join(replyFolder, targetReference.jsonFile), 'utf8'));
        if (target.type === 'EXECUTABLE' && target.artifacts && target.artifacts[0])
        {
            executables.push({
                label      : target.name,
                description: target.artifacts[0].path,
                path       : path.resolve(BUILD_DIR_PATH, target.artifacts[0].path),
            });
        }
    }

    if (executables.length === 0) return;
    const workspaceKey = ACTIVE_WORKSPACE_FOLDER && ACTIVE_WORKSPACE_FOLDER.uri.toString();
    const previousTarget = workspaceKey && SELECTED_TARGETS.get(workspaceKey);
    const previousSelection = executables.find(executable => executable.label === previousTarget);
    const selected = previousSelection || (executables.length === 1 ? executables[0] : await vscode.window.showQuickPick(executables,
        { placeHolder: 'Choose the executable target to run or debug' }));
    if (selected)
    {
        EXECUTABLE_NAME = selected.label;
        EXECUTABLE_PATH = selected.path;
        if (workspaceKey) SELECTED_TARGETS.set(workspaceKey, selected.label);
    }
}

/**
 * @param {string} filePath File path.
 * @returns {Promise<boolean>} Whether it exists.
 */
async function fileExists(filePath)
{
    try
    {
        await fs.promises.access(filePath);
        return true;
    }
    catch (error)
    {
        return false;
    }
}

/** @param {number|undefined} processId Process identifier. */
function terminateProcessTree(processId)
{
    if (!processId) return;
    if (CheckOs() === OsTypes.WINDOWS)
    {
        spawn('taskkill', ['/pid', String(processId), '/T', '/F'], { windowsHide: true });
        return;
    }

    try
    {
        process.kill(processId, 'SIGTERM');
    }
    catch (error)
    {
        // The process may already have completed.
    }
}

/**
 * Creates a test build and runs the test application.
 * @returns {Promise<boolean>}
 */
async function invokeTests()
{
    if (!await syncPaths()) return false;

    const testBuildState = new BuildState(BuildTypes.TEST);
    const didRun = await invokeRun(testBuildState, true, TEST_TASK_NAME);
    if (!didRun)
    {
        return false;
    }

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
    if (!await syncPaths()) return false;

    const debuggerExtensionId = CheckOs() === OsTypes.MACOS ? 'vadimcn.vscode-lldb' : 'ms-vscode.cpptools';
    if (!vscode.extensions.getExtension(debuggerExtensionId))
    {
        const action = await vscode.window.showWarningMessage(
            `Debugging requires ${debuggerExtensionId}.`, 'Install Debugger');
        if (action === 'Install Debugger')
        {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', debuggerExtensionId);
        }
        return false;
    }

    await cleanBuild(true);
    const didBuild = await invokeBuild(buildState);
    if (!didBuild)
    {
        return false;
    }

    const workspaceFolder = ACTIVE_WORKSPACE_FOLDER;
    if (!workspaceFolder)
    {
        return false;
    }

    const configuredProfiles = vscode.workspace.getConfiguration('launch', workspaceFolder.uri).get('configurations', []);
    const configuredProfile = configuredProfiles.find(profile => profile.name === 'c-toolkit launch') || {};
    return vscode.debug.startDebugging(workspaceFolder, { ...configuredProfile, name: 'c-toolkit launch', program: EXECUTABLE_PATH });
}

/**
 * Builds the test configuration and starts a debug session for it.
 * 
 * @returns {Promise<boolean>}
 */
async function invokeDebugTest()
{
    if (!await syncPaths()) return false;

    const testBuildState = new BuildState(BuildTypes.TEST);
    return invokeDebug(testBuildState);
}

module.exports = 
{
    BuildState,
    BuildTypes,
    selectBuild,
    cleanBuild,
    invokeBuild,
    invokeRun,
    invokeDebug,
    invokeDebugTest,
    invokeTests,
};
