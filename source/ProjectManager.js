const fs                   = require('fs');
const path                 = require('path');
const vscode               = require('vscode');
const fileContents         = require('./FileContents');
const Logger               = require('./Logger');
const { SanitizeFileName, GetWorkspacePath } = require('./CommonUtils');

/** @type {vscode.Disposable} */
let CommandCreateCProject;

/** @type {vscode.Disposable} */
let CommandCreateCppProject;

/** @type {Project} */
let CurrentProject = undefined;

/**
 * Self explanatory
 */
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
 * Reads the root CMakeLists.txt in the open workspace to decide if the
 * project is for C++ or C.
 * 
 * @returns {boolean?} True if it's C++, False if C, undefined if it's unable to find.
 */
function IsProjectCpp()
{
    /** @type {boolean?} */
    let isCpp = undefined;

    const rootPath = GetWorkspacePath();
    const cmakeListsPath = path.join(rootPath, 'CMakeLists.txt');

    try
    {
        const data = fs.readFileSync(cmakeListsPath, 'utf8');
        const languageLine = data.split('\n').find(line => line.includes('LANGUAGES'));
        if (languageLine)
        {
            if (languageLine.includes('CXX') || languageLine.includes('C++'))
            {
                isCpp = true;
            }
            else if (languageLine.includes('C'))
            {
                isCpp = false;
            }
            else
            {
                isCpp = undefined;
            }
        }
        else
        {
            const msg = 'Unable to determine the project language from CMakeLists.txt';
            Logger.Warning(msg);
            vscode.window.showWarningMessage(msg);
        }
    }
    catch (err)
    {
        const msg = `Failed to read CMakeLists.txt: ${err.message}`;
        Logger.Warning(msg);
        vscode.window.showWarningMessage(msg);
    }

    return isCpp;
}

/**
 * Registers the 'createProject' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function CreateCProjectCommand(context)
{
    if (CommandCreateCProject)
    {
        CommandCreateCProject.dispose();
    }
    CommandCreateCProject = vscode.commands.registerCommand("extension.createCProject", createNewCProject);
    context.subscriptions.push(CommandCreateCProject);
}

/**
 * Registers the 'createProject' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function CreateCppProjectCommand(context)
{
    if (CommandCreateCppProject)
    {
        CommandCreateCppProject.dispose();
    }
    CommandCreateCppProject = vscode.commands.registerCommand("extension.createCppProject", createNewCppProject);
    context.subscriptions.push(CommandCreateCppProject);
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
 * @param {string}  projectDirPath The directory path where the project files will be located.
 * @param {boolean} isCpp          Should be true if the project is in C++
 * 
 * @returns {Array<{path: string, content: string}>} An array of file objects with path and content properties.
 */
function ComposeSourceFiles(projectDirPath, isCpp) 
{
    let files = 
    [
        {
            path    : path.join(projectDirPath, isCpp ? 'main.cpp' : 'main.c'),
            content : fileContents.MainSource(isCpp),
        },
        {
            path    : path.join(projectDirPath, "CMakeLists.txt"),
            content : fileContents.ProjectCmake(isCpp)
        },
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
 * @param {boolean} isCpp If the project language is C++ or not.
 * 
 * @returns {Promise<void|undefined>}
 * A promise that resolves when the project is created, or undefined if the
 * creation was cancelled or the project already existed.
 */
async function createNewProject(isCpp)
{
    CurrentProject = new Project(undefined);

    let projectDirPath = await PrepareProjectDirectory(CurrentProject);
    if (projectDirPath === undefined) return undefined;

    /** @type {Array<{ path: string, content: string }>} */
    let files = [];
    let sourceFiles = ComposeSourceFiles(projectDirPath, isCpp);
    let vscodeFiles = ComposeVscodeFiles(projectDirPath);

    files = [...files, ...sourceFiles];
    files = [...files, ...vscodeFiles];

    files.forEach(file => fs.writeFileSync(file.path, file.content));

    // Open the new project directory in VSCode
    const uri = vscode.Uri.file(projectDirPath);
    await vscode.commands.executeCommand('vscode.openFolder', uri);

    Logger.Info(`New project created in ${projectDirPath}`);
}

/** @returns {Promise<void>} */
async function createNewCProject()
{
    createNewProject(false);
}

/** @returns {Promise<void>} */
async function createNewCppProject()
{
    createNewProject(true);
}

module.exports = 
{
    CreateCProjectCommand,
    CreateCppProjectCommand,
    ComposeVscodeFiles,
    IsProjectCpp,
};