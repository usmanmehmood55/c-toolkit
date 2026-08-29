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
    const stagingFolder = path.join(workspacePath, `.vscode.c-toolkit-${Date.now()}`);
    /** @type {string|undefined} */
    let previousFolder;

    // Check if .vscode exists and prompt for confirmation
    if (fs.existsSync(vscodeFolder)) 
    {
        const choice = await vscode.window.showWarningMessage(
            "Refreshing configurations will cause the .vscode folder to be overwritten. Do you want to continue?", 
            "Yes", 
            "Yes and Backup", 
            "No"
        );

        if (choice !== "Yes" && choice !== "Yes and Backup")
        {
            return undefined;
        }

        previousFolder = choice === "Yes and Backup" ?
            GetAvailableBackupPath(backupFolder) : `${stagingFolder}-previous`;
    }

    try
    {
        await fs.promises.mkdir(stagingFolder, { recursive: true });

        /** @type {Array<{ path: string, content: string }>} */
        const vscodeFiles = ProjectManager.ComposeVscodeFiles(workspacePath, false);
        await Promise.all(vscodeFiles.map(file =>
            fs.promises.writeFile(path.join(stagingFolder, path.basename(file.path)), file.content)));

        if (previousFolder)
        {
            await fs.promises.rename(vscodeFolder, previousFolder);
        }

        await fs.promises.rename(stagingFolder, vscodeFolder);

        if (previousFolder && previousFolder.endsWith('-previous'))
        {
            await fs.promises.rm(previousFolder, { recursive: true });
        }
    }
    catch (error)
    {
        await fs.promises.rm(stagingFolder, { recursive: true, force: true });

        if (previousFolder && fs.existsSync(previousFolder) && !fs.existsSync(vscodeFolder))
        {
            await fs.promises.rename(previousFolder, vscodeFolder);
        }

        const message = error instanceof Error ? error.message : String(error);
        Logger.Error(`Failed to refresh configurations: ${message}`);
        vscode.window.showErrorMessage(`Failed to refresh configurations: ${message}`);
    }
}

/**
 * Finds a backup path without deleting an existing backup.
 *
 * @param {string} preferredPath Preferred backup path
 * @returns {string} Available backup path
 */
function GetAvailableBackupPath(preferredPath)
{
    if (!fs.existsSync(preferredPath))
    {
        return preferredPath;
    }

    let suffix = 1;
    let candidate = `${preferredPath}-${suffix}`;
    while (fs.existsSync(candidate))
    {
        suffix++;
        candidate = `${preferredPath}-${suffix}`;
    }

    return candidate;
}

module.exports = RefreshConfigsCommand;
