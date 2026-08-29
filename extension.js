const vscode                 = require('vscode');
const CreateComponentCommand = require('./source/ComponentManager');
const buttonActions          = require('./source/ButtonActions');
const ProjectManager         = require('./source/ProjectManager');
const ToolsManager           = require('./source/ToolsManager');
const Logger                 = require('./source/Logger');
const RefreshConfigsCommand  = require('./source/ConfigManager');
const FeedbackManager        = require('./source/FeedbackManager');
const { BuildReporter, OutputModes } = require('./source/BuildReporter');

const BuildState      = buttonActions.BuildState;
const BuildTypes      = buttonActions.BuildTypes;

let buildState = new BuildState(BuildTypes.DEBUG);

/**
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function activate(context)
{
    Logger.Info("C C++ Toolkit extension activating");
    context.subscriptions.push(BuildReporter);
    FeedbackManager.Initialize(context);

    const buttons = 
    [
        new StatusBarButton("Build Type", `$(gear) ${buildState.type}`, "extension.selectBuild", "Click to switch build type",  16),
        new StatusBarButton("Clean",      "$(trash) Clean",             "extension.clean",       "Clean the build",             15),
        new StatusBarButton("Build",      "$(database) Build",          "extension.build",       "Build the project",           14),
        new StatusBarButton("Run"  ,      "$(run) Run",                 "extension.run",         "Run the application",         13),
        new StatusBarButton("Debug",      "$(debug) Debug",             "extension.debug",       "Debug the processor",         12),
        new StatusBarButton("Test",       "$(beaker) Test",             "extension.test",        "Run tests",                   11),
        new StatusBarButton("Debug Test", "$(debug-alt) Debug Test",    "extension.debugTest",   "Click to debug the test app", 10)
    ];

    const disposables = buttons.map(button => createStatusBarItem(button, context));

    CreateComponentCommand(context);
    ProjectManager.CreateCProjectCommand(context);
    ProjectManager.CreateCppProjectCommand(context);
    RefreshConfigsCommand(context);
    ToolsManager.SearchForToolsCommand(context);
    SelectOutputModeCommand(context);

    vscode.window.onDidChangeActiveColorTheme(e => // eslint-disable-line no-unused-vars
    {
        for (let item of disposables)
        {
            let button = buttons.find(b => b.command === item.command);
            if (button)
            {
                item.color = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? button.darkIconColor : undefined;
            }
        }
    });

    Logger.Info("C C++ Toolkit extension activated");
}

/**
 * Registers the command that changes build-output detail.
 * @param {vscode.ExtensionContext} context Extension context.
 */
function SelectOutputModeCommand(context)
{
    const command = vscode.commands.registerCommand('extension.selectOutputMode', async () =>
    {
        const labels =
        {
            [OutputModes.GUIDED]  : 'Guided: progress and concise stages',
            [OutputModes.COMMANDS]: 'Commands: stages and reproducible commands',
            [OutputModes.VERBOSE] : 'Verbose: complete build output',
        };
        const selection = await vscode.window.showQuickPick(Object.entries(labels).map(([value, label]) => ({ label, value })),
            { placeHolder: 'Choose how build activity is displayed' });

        if (selection)
        {
            await vscode.workspace.getConfiguration('c-cpp-toolkit').update(
                'outputMode', selection.value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`C C++ Toolkit output mode: ${selection.label}`);
        }
    });
    context.subscriptions.push(command);
}

/**
 * Status bar button.
 */
class StatusBarButton
{
    /**
     * Creates a status bar button.
     * @param {string} name     The name of the button, used for identification and action mapping.
     * @param {string} text     The text and icon displayed on the button.
     * @param {string} command  The command ID associated with this button.
     * @param {string} tooltip  The tooltip text displayed when hovering over the button.
     * @param {number} priority The priority order of the button in the status bar (higher values appear to the left).
     */
    constructor(name, text, command, tooltip, priority)
    {
        this.name          = name;
        this.text          = text;
        this.command       = command;
        this.tooltip       = tooltip;
        this.priority      = priority;
        this.darkIconColor = "#A6E22E";
    }
}

/**
 * @param {StatusBarButton} button
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 * @returns {vscode.StatusBarItem}
 */
function createStatusBarItem(button, context)
{
    let item     = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, button.priority);
    item.text    = button.text;
    item.tooltip = button.tooltip;
    item.color   = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? button.darkIconColor : undefined;
    item.command = button.command;
    item.show();

    /** @type {Record<string, () => Promise<unknown>>} */
    const buttonActionsMap =
    {
        /** @returns {Promise<unknown>} Build selection completion. */
        "Build Type": () => buttonActions.selectBuild(item, buildState).then((selectedBuild) => { buildState = selectedBuild; }),   // eslint-disable-line brace-style
        /** @returns {Promise<unknown>} Clean completion. */
        "Clean"     : () => buttonActions.cleanBuild(false),
        /** @returns {Promise<unknown>} Build completion. */
        "Build"     : () => buttonActions.invokeBuild(buildState),
        /** @returns {Promise<unknown>} Run completion. */
        "Run"       : () => buttonActions.invokeRun(buildState, false),
        /** @returns {Promise<unknown>} Debug completion. */
        "Debug"     : () => buttonActions.invokeDebug(buildState),
        /** @returns {Promise<unknown>} Test completion. */
        "Test"      : () => buttonActions.invokeTests(),
        /** @returns {Promise<unknown>} Test debugging completion. */
        "Debug Test": () => buttonActions.invokeDebugTest(),
    };

    const buttonAction = buttonActionsMap[button.name];

    if (buttonAction)
    {
        let command = vscode.commands.registerCommand(button.command, buttonAction);
        context.subscriptions.push(item, command);
    }
    else
    {
        vscode.window.showErrorMessage(`Button "${button.name}" has not been handled.`);
    }

    return item;
}

/** @returns {void} */
function deactivate()
{
    Logger.Info("C C++ Toolkit extension deactivated");
}

module.exports = 
{
    activate,
    deactivate
};
