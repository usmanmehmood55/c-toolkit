const vscode                 = require('vscode');
const CreateComponentCommand = require('./source/ComponentManager');
const buttonActions          = require('./source/ButtonActions');
const CreateProjectCommand   = require('./source/ProjectManager');

const BuildTypes = 
{
    RELEASE : 'Release',
    TEST    : 'Test',
    DEBUG   : 'Debug',
};

let buildType = BuildTypes.RELEASE;

/**
 * @param {*} context 
 */
function activate(context) 
{
    const buttons = 
    [
        new StatusBarButton("Build Type", `$(gear) ${buildType}`,    'extension.selectBuild', "Click to switch build type",  7),
        new StatusBarButton("Clean",      "$(trash) Clean",          'extension.clean',       "Clean the build",             6),
        new StatusBarButton("Build",      "$(database) Build",       'extension.build',       "Build the project",           5),
        new StatusBarButton("Run"  ,      "$(run) Run",              'extension.run',         "Run the application",         4),
        new StatusBarButton("Debug",      "$(debug) Debug",          'extension.debug',       "Debug the processor",         3),
        new StatusBarButton("Test",       "$(beaker) Test",          'extension.test',        "Run tests",                   2),
        new StatusBarButton("Debug Test", `$(debug-alt) Debug Test`, 'extension.debugTest',   "Click to debug the test app", 1)
    ];

    const disposables = buttons.map(button => createStatusBarItem(button, context));

    CreateComponentCommand(context);
    CreateProjectCommand(context);

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
        "Build Type": () => buttonActions.selectBuild(item, buildType).then((selectedBuild) => { buildType = selectedBuild; }),   // eslint-disable-line brace-style
        "Clean"     : () => buttonActions.cleanBuild(false),
        "Build"     : () => buttonActions.invokeBuild(buildType),
        "Run"       : () => buttonActions.invokeRun(buildType, true),
        "Debug"     : () => buttonActions.invokeDebug(buildType),
        "Test"      : () => buttonActions.invokeTests(),
        "Debug Test": () => buttonActions.invokeDebug(BuildTypes.TEST),
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
{}

module.exports = 
{
    activate,
    deactivate
};