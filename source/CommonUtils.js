const os     = require('os');
const fs     = require('fs');
const vscode = require('vscode');
const path   = require('path');
const { spawnSync } = require('child_process');

/** @type {vscode.WorkspaceFolder|undefined} */
let selectedWorkspaceFolder;

/**
 * Enum for OS types
 */
const OsTypes = 
{
    WINDOWS : 'windows',
    LINUX   : 'linux',
    MACOS   : 'macos',
};

/**
 * Checks the OS type, if it is Windows, Linux or MacOS.
 * 
 * @returns {string} enum of OS Type
 */
function CheckOs()
{
    switch (os.platform()) 
    {
    case 'win32':
        return OsTypes.WINDOWS;
    case 'darwin':
        return OsTypes.MACOS;
    case 'linux':
        return OsTypes.LINUX;
    default:
        throw new Error('Unsupported OS type');
    }
}

/**
 * Wraps individual components of a path in quotes if they contain spaces.
 * 
 * @param {string} inputPath The path to check and possibly wrap.
 * 
 * @returns {string} The path with individual components possibly quoted.
 */
function WrapSpacedComponents(inputPath)
{
    return inputPath.split(path.sep).map(component =>
    {
        if (component.includes(' '))
        {
            return `"${component}"`;
        }

        return component;
    }).join(path.sep);
}


/**
 * Formats a list of items into a human-friendly string.
 *
 * @param {string[]} items The list of items to format.
 * 
 * @returns {string} A string in the format "item1, item2, ... and lastItem".
 */
function FormatList(items)
{
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return items.slice(0, items.length - 1).join(', ') + ' and ' + items[items.length - 1];
}

/**
 * Replaces all invalid characters (including spaces) with an underscore
 * 
 * @param {string} name File name to sanitize
 * 
 * @returns {string} Sanitized file name
 */
function SanitizeFileName(name)
{
    // Get all unique invalid characters
    const invalidChars = Array.from(new Set(name.match(/[^a-zA-Z0-9_ ]/g) || []));

    if (invalidChars.length > 0)
    {
        vscode.window.showWarningMessage(`Invalid characters found: ${FormatList(invalidChars)}`);
    }

    // Replace all invalid characters (including spaces) with an underscore
    let invalidRemoved = name.replace(/[^a-zA-Z0-9_ ]/g, '_').replace(/ /g, '_');
    while (invalidRemoved.includes('__'))
    {
        invalidRemoved = invalidRemoved.replace('__', '_');
    }

    return invalidRemoved;
}

/**
 * Returns Windows Scoop package locations that may contain the requested tool.
 *
 * @param {string} program The program to find.
 *
 * @returns {string[]} candidate absolute paths
 */
function GetWindowsToolCandidates(program)
{
    const scoopRoot = path.join(os.homedir(), 'scoop');

    /** @type {string[]} */
    const candidates =
    [
        path.join(scoopRoot, 'shims', `${program}.exe`),
        path.join(scoopRoot, 'shims', `${program}.cmd`),
        path.join(scoopRoot, 'apps', program, 'current', `${program}.exe`),
        path.join(scoopRoot, 'apps', program, 'current', 'bin', `${program}.exe`),
        path.join(scoopRoot, 'apps', program, 'current', 'usr', 'bin', `${program}.exe`),
        path.join(scoopRoot, 'apps', 'gcc', 'current', 'bin', `${program}.exe`),
        path.join(scoopRoot, 'apps', 'gcc', 'current', 'libexec', 'gcc', 'x86_64-w64-mingw32', `${program}.exe`),
    ];

    return candidates;
}

/**
 * Finds the path of the given program using the 'which' command.
 * 
 * @param {string} program The program to find.
 * 
 * @returns {string | undefined} The path to the program or undefined if not found.
 */
function FindProgramPath(program)
{
    const lookupCommand = CheckOs() === OsTypes.WINDOWS ? 'where' : 'which';
    const lookup = spawnSync(lookupCommand, [program], { encoding: 'utf-8', timeout: 5000 });
    if (lookup.status === 0 && lookup.stdout)
    {
        return lookup.stdout.split(/\r?\n/).map(line => line.trim()).find(Boolean);
    }

    return CheckOs() === OsTypes.WINDOWS ?
        GetWindowsToolCandidates(program).find(eachCandidate => fs.existsSync(eachCandidate)) : undefined;
}

/**
 * Retrieves the file system path of the first workspace folder opened in VSCode.
 * This function is to be used when the extension requires access to the current workspace
 * directory. It checks if there are any workspace folders currently opened and returns
 * the path of the first one if available.
 *
 * @returns {string|undefined}
 * The file system path of the first workspace folder if any, otherwise `undefined` if
 * no workspace folders are open.
 */
function GetWorkspacePath()
{
    const activeUri = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri;
    const activeFolder = activeUri && vscode.workspace.getWorkspaceFolder(activeUri);
    if (activeFolder)
    {
        selectedWorkspaceFolder = activeFolder;
        return activeFolder.uri.fsPath;
    }

    const folders = vscode.workspace.workspaceFolders || [];
    if (selectedWorkspaceFolder && folders.some(folder => folder.uri.toString() === selectedWorkspaceFolder.uri.toString()))
    {
        return selectedWorkspaceFolder.uri.fsPath;
    }

    if (folders.length === 1) return folders[0].uri.fsPath;

    return undefined;
}

/**
 * Resolves a workspace folder, asking when a multi-root workspace is ambiguous.
 * @returns {Promise<vscode.WorkspaceFolder|undefined>} Selected folder.
 */
async function SelectWorkspaceFolder()
{
    const existingPath = GetWorkspacePath();
    if (existingPath)
    {
        return (vscode.workspace.workspaceFolders || []).find(folder => folder.uri.fsPath === existingPath);
    }

    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length === 0) return undefined;

    const selection = await vscode.window.showQuickPick(
        folders.map(folder => ({ label: folder.name, description: folder.uri.fsPath, folder })),
        { placeHolder: 'Choose the C/C++ project to use' });
    selectedWorkspaceFolder = selection && selection.folder;
    return selectedWorkspaceFolder;
}

module.exports =
{
    FormatList,
    SanitizeFileName,
    OsTypes,
    CheckOs,
    WrapSpacedComponents,
    FindProgramPath,
    GetWorkspacePath,
    SelectWorkspaceFolder
};
