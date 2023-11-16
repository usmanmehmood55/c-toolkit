const fs                   = require('fs');
const path                 = require('path');
const vscode               = require('vscode');
const fileContents         = require('./FileContents');
const { SanitizeFileName } = require('./CommonUtils');
const Logger               = require('./Logger');

/** @type {vscode.Disposable} */
let createProjectDisposable;

/**
 * Registers the 'createProject' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function CreateProjectCommand(context)
{
    if (createProjectDisposable)
    {
        createProjectDisposable.dispose();
    }
    createProjectDisposable = vscode.commands.registerCommand("extension.createProject", createNewProject);
    context.subscriptions.push(createProjectDisposable);
}

class Project
{
    /**
     * Creates a new Project instance.
     * 
     * @param {string?} name The name of the project.
     */
    constructor(name)
    {
        this.name      = name;
        this.gccPath   = null;
        this.gdbPath   = null;
        this.cmakePath = null;
        this.ninjaPath = null;
    }
}

/**
 * Composes a list of files to be created for a project.
 * 
 * @param {string}  projectDirPath The directory path where the project files will be located.
 * 
 * @returns {Array<{path: string, content: string}>} An array of file objects with path and content properties.
 */
function ComposeVscodeFiles(projectDirPath) 
{
    fs.mkdirSync(path.join(projectDirPath, ".vscode"), { recursive: true });

    let files = 
    [
        { path: path.join(projectDirPath, ".vscode", "c_cpp_properties.json"), content: fileContents.CppPropertiesJson() },
        { path: path.join(projectDirPath, ".vscode", "launch.json"),           content: fileContents.LaunchJson()        },
        { path: path.join(projectDirPath, ".vscode", "settings.json"),         content: fileContents.SettingsJson()      },
        { path: path.join(projectDirPath, ".vscode", "tasks.json"),            content: fileContents.TasksJson()         },
    ];

    return files;
}

/**
 * Composes a list of files to be created for a project.
 * 
 * @param {Project} project        The project to compose files for.
 * @param {string}  projectDirPath The directory path where the project files will be located.
 * 
 * @returns {Array<{path: string, content: string}>} An array of file objects with path and content properties.
 */
function ComposeSourceFiles(project, projectDirPath) 
{
    let files = 
    [
        { path: path.join(projectDirPath, "main.c"),         content: fileContents.MainSource()   },
        { path: path.join(projectDirPath, "CMakeLists.txt"), content: fileContents.ProjectCmake() },
    ];

    return files;
}

/**
 * Prepares a directory for the project inside the selected base folder.
 * 
 * @param {Project} project The project for which to prepare the directory.
 * 
 * @returns {Promise<string|undefined>}
 * The path to the project directory, or undefined if the folder already
 * exists or no folder was selected.
 */
async function PrepareProjectDirectory(project)
{
    // Have the user pick the project base folder, like Desktop or Documents or whatever
    const selectedFolderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles  : false,
        canSelectMany   : false,
        openLabel       : "Select Base Folder"
    });

    if (!selectedFolderUri || selectedFolderUri.length === 0)
    {
        Logger.Warning('No folder selected.');
        vscode.window.showErrorMessage('No folder selected.');
        return;
    }

    const baseFolderPath = selectedFolderUri[0].fsPath;

    // Ask the user about the project name
    let projectName = await vscode.window.showInputBox({
        prompt     : "Enter your project name",
        value      : project.name,
        placeHolder: "Project name"
    });

    if (!projectName)
    {
        Logger.Warning('Unable to create a project: project name is required.');
        vscode.window.showWarningMessage('Project name is required.');
        return;
    }

    projectName = SanitizeFileName(projectName);

    const projectDirPath = path.join(baseFolderPath, projectName);

    // If a folder with that name already exists then show an error
    if (fs.existsSync(projectDirPath))
    {
        Logger.Error(`Project "${projectName}" already exists.`);
        vscode.window.showErrorMessage(`Project "${projectName}" already exists.`);
        return undefined;
    }

    // Otherwise, create a folder of that name
    fs.mkdirSync(projectDirPath, { recursive: true });

    return projectDirPath;
}

/**
 * Handles the creation of a new project.
 * 
 * @returns {Promise<void|undefined>}
 * A promise that resolves when the project is created, or undefined if the
 * creation was cancelled or the project already existed.
 */
async function createNewProject()
{
    let project = new Project(undefined);

    let projectDirPath = await PrepareProjectDirectory(project);
    if (projectDirPath === undefined) return undefined;

    /** @type {Array<{ path: string, content: string }>} */
    let files = [];
    let sourceFiles = ComposeSourceFiles(project, projectDirPath);
    let vscodeFiles = ComposeVscodeFiles(projectDirPath);

    files = [...files, ...sourceFiles];
    files = [...files, ...vscodeFiles];

    files.forEach(file => fs.writeFileSync(file.path, file.content));

    // Open the new project directory in VSCode
    const uri = vscode.Uri.file(projectDirPath);
    await vscode.commands.executeCommand('vscode.openFolder', uri);

    Logger.Info(`New project created in ${projectDirPath}`);
}

module.exports = 
{
    CreateProjectCommand,
    ComposeVscodeFiles
};