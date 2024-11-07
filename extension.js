const vscode                 = require('vscode');
const CreateComponentCommand = require('./source/ComponentManager');
const buttonActions          = require('./source/ButtonActions');
const ProjectManager         = require('./source/ProjectManager');
const ToolsManager           = require('./source/ToolsManager');
const Logger                 = require('./source/Logger');
const RefreshConfigsCommand  = require('./source/ConfigManager');

const BuildState      = buttonActions.BuildState;
const BuildTypes      = buttonActions.BuildTypes;
const BuildSubsystems = buttonActions.BuildSubsystems;

let buildState = new BuildState(BuildTypes.DEBUG,  BuildSubsystems.NINJA);

/**
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function activate(context)
{
    Logger.Info("C C++ Toolkit extension activated");

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
    ToolsManager.SearchForTools();

    vscode.window.onDidChangeActiveColorTheme(e => // eslint-disable-line no-unused-vars
    {
        for (let item of disposables)
        {
            let button = buttons.find(b => b.command === item.command);
            item.color = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? button.darkIconColor : undefined;
        }
    });
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

    const buttonActionsMap =
    {
        /** @returns {Promise<void>}  */
        "Build Type": () => buttonActions.selectBuild(item, buildState).then((selectedBuild) => { buildState = selectedBuild; }),   // eslint-disable-line brace-style
        /** @returns {Promise<void>} */
        "Clean"     : () => buttonActions.cleanBuild(false),
        /** @returns {Promise<void>} */
        "Build"     : () => buttonActions.invokeBuild(buildState),
        /** @returns {Promise<void>} */
        "Run"       : () => buttonActions.invokeRun(buildState, false),
        /** @returns {Promise<void>} */
        "Debug"     : () => buttonActions.invokeDebug(buildState),
        /** @returns {Promise<void>} */
        "Test"      : () => buttonActions.invokeTests(buildState),
        /** @returns {Promise<void>} */
        "Debug Test": () => buttonActions.invokeDebug(buildState),
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