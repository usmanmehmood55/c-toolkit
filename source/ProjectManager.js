const fs               = require('fs');
const path             = require('path');
const vscode           = require('vscode');
const fileContents     = require('./FileContents');
const { SanitizeFileName } = require('./CommonUtils');

let createProjectDisposable;

/**
 * @param {*} context 
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
     * @param {string?} name
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
 * 
 * 
 * @param {Project} project 
 * @param {string}  projectDirPath 
 * 
 * @returns 
 */
function ComposeProjectFiles(project, projectDirPath) 
{
    fs.mkdirSync(path.join(projectDirPath, ".vscode"), { recursive: true });

    let files = 
    [
        { path: path.join(projectDirPath, "main.c"),         content: fileContents.MainSource()   },
        { path: path.join(projectDirPath, "CMakeLists.txt"), content: fileContents.ProjectCmake() },

        { path: path.join(projectDirPath, ".vscode", "c_cpp_properties.json"), content: fileContents.CppPropertiesJson() },
        { path: path.join(projectDirPath, ".vscode", "launch.json"),           content: fileContents.LaunchJson()        },
        { path: path.join(projectDirPath, ".vscode", "settings.json"),         content: fileContents.SettingsJson()      },
        { path: path.join(projectDirPath, ".vscode", "tasks.json"),            content: fileContents.TasksJson()         },
    ];

    return files;
}

/**
 * Creates a directory for the project inside the "projects" directory
 * 
 * @param {Project} project 
 * 
 * @returns undefined if the project folder already exists
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
        vscode.window.showErrorMessage("No folder selected.");
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
        vscode.window.showErrorMessage("Project name is required.");
        return;
    }

    projectName = SanitizeFileName(projectName);

    const projectDirPath = path.join(baseFolderPath, projectName);

    // If a folder with that name already exists then show an error
    if (fs.existsSync(projectDirPath))
    {
        vscode.window.showErrorMessage(`Project "${projectName}" already exists.`);
        return undefined;
    }

    // Otherwise, create a folder of that name
    fs.mkdirSync(projectDirPath, { recursive: true });

    return projectDirPath;
}

/**
 * Creates a new project by asking the user about project name and properties
 * 
 * @returns undefined if project creation was cancelled or it already existed
 */
async function createNewProject()
{
    let project = new Project(undefined);

    let projectDirPath = await PrepareProjectDirectory(project);
    if (projectDirPath === undefined) return undefined;

    let files = ComposeProjectFiles(project, projectDirPath);
    files.forEach(file => fs.writeFileSync(file.path, file.content));

    // Open the new project directory in VSCode
    const uri = vscode.Uri.file(projectDirPath);
    await vscode.commands.executeCommand('vscode.openFolder', uri);
}

module.exports = CreateProjectCommand;