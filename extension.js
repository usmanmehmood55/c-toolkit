const vscode                 = require('vscode');
const CreateComponentCommand = require('./source/ComponentManager');
const buttonActions          = require('./source/ButtonActions');
const CreateProjectCommand   = require('./source/ProjectManager');
const ToolsManager           = require('./source/ToolsManager');

const BuildState      = buttonActions.BuildState;
const BuildTypes      = buttonActions.BuildTypes;
const BuildSubsystems = buttonActions.BuildSubsystems;

let buildState = new BuildState(BuildTypes.DEBUG,  BuildSubsystems.NINJA);

/**
 * @param {*} context 
 */
function activate(context) 
{
    const buttons = 
    [
        new StatusBarButton("Build Type", `$(gear) ${buildState.type}`, "extension.selectBuild", "Click to switch build type",  7),
        new StatusBarButton("Clean",      "$(trash) Clean",             "extension.clean",       "Clean the build",             6),
        new StatusBarButton("Build",      "$(database) Build",          "extension.build",       "Build the project",           5),
        new StatusBarButton("Run"  ,      "$(run) Run",                 "extension.run",         "Run the application",         4),
        new StatusBarButton("Debug",      "$(debug) Debug",             "extension.debug",       "Debug the processor",         3),
        new StatusBarButton("Test",       "$(beaker) Test",             "extension.test",        "Run tests",                   2),
        new StatusBarButton("Debug Test", "$(debug-alt) Debug Test",    "extension.debugTest",   "Click to debug the test app", 1)
    ];

    const disposables = buttons.map(button => createStatusBarItem(button, context));

    CreateComponentCommand(context);
    CreateProjectCommand(context);
    ToolsManager.searchForTools();

    vscode.window.onDidChangeActiveColorTheme(e => // eslint-disable-line no-unused-vars
    {
        for (let item of disposables)
        {
            let button = buttons.find(b => b.command === item.command);
            item.color = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? button.darkIconColor : undefined;
        }
    });
}

class StatusBarButton
{
    /**
     * @param {string} name 
     * @param {string} text 
     * @param {string} command 
     * @param {string} tooltip 
     * @param {number} priority
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
 * @param {*} context
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
        "Build Type": () => buttonActions.selectBuild(item, buildState).then((selectedBuild) => { buildState = selectedBuild; }),   // eslint-disable-line brace-style
        "Clean"     : () => buttonActions.cleanBuild(false),
        "Build"     : () => buttonActions.invokeBuild(buildState),
        "Run"       : () => buttonActions.invokeRun(buildState, true),
        "Debug"     : () => buttonActions.invokeDebug(buildState),
        "Test"      : () => buttonActions.invokeTests(buildState),
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

function deactivate()
{
    console.log("C Toolkit extension deactivated");
}

module.exports = 
{
    activate,
    deactivate
};