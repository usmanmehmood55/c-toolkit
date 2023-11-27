const vscode             = require('vscode');
const {SearchForTools}   = require('./ToolsManager');
const ProjectManager     = require('./ProjectManager');
const {GetWorkspacePath} = require('./CommonUtils');
const fs                 = require('fs');
const path               = require('path');
const Logger             = require('./Logger');

/** @type {vscode.Disposable} */
let refreshConfigsDisposable;

/**
 * Registers the 'refreshConfigs' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function RefreshConfigsCommand(context)
{
    if (refreshConfigsDisposable)
    {
        refreshConfigsDisposable.dispose();
    }
    refreshConfigsDisposable = vscode.commands.registerCommand("extension.refreshConfigs", refreshConfigs);
    context.subscriptions.push(refreshConfigsDisposable);
}

/**
 * Refreshes the project's configurations including
 * - Search for build tools
 * - Search for paths of tools
 * - Updating the relevant paths for IntelliSense
 * 
 * @returns {Promise<void|undefined>}
 * A promise that resolves when the project is created, or undefined if the
 * creation was cancelled or the project already existed.
 */
async function refreshConfigs() 
{
    Logger.Info('Refresh config triggered');

    await SearchForTools();

    let workspacePath = GetWorkspacePath();
    if (!workspacePath) 
    {
        vscode.window.showErrorMessage("No folder open in the workspace");
        return undefined;
    }

    const vscodeFolder = path.join(workspacePath, '.vscode');
    const backupFolder = path.join(workspacePath, '.oldVscode');

    // Check if .vscode exists and prompt for confirmation
    if (fs.existsSync(vscodeFolder)) 
    {
        const choice = await vscode.window.showWarningMessage(
            "Refreshing configurations will cause the .vscode folder to be overwritten. Do you want to continue?", 
            "Yes", 
            "Yes and Backup", 
            "No"
        );

        switch (choice) 
        {
        case "Yes":
            fs.rmSync(vscodeFolder, { recursive: true });
            break;
        case "Yes and Backup":
            if (fs.existsSync(backupFolder))
            {
                fs.rmSync(backupFolder, { recursive: true });
            }
            fs.renameSync(vscodeFolder, backupFolder);
            break;
        case "No":
            // Exit without making changes
            return undefined;
        }
    }

    // Create new configurations
    /** @type {Array<{ path: string, content: string }>} */
    let vscodeFiles = ProjectManager.ComposeVscodeFiles(workspacePath);
    vscodeFiles.forEach(file => fs.writeFileSync(file.path, file.content));
}

module.exports = RefreshConfigsCommand;