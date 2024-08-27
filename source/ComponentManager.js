const fs           = require('fs');
const path         = require('path');
const vscode       = require('vscode');
const fileContents = require('./FileContents');
const Logger       = require('./Logger');
const { SanitizeFileName, GetWorkspacePath } = require('./CommonUtils');
const { IsProjectCpp } = require('./ProjectManager');

let createComponentDisposable;

/**
 * Registers the 'createComponent' command in the extension.
 * 
 * @param {vscode.ExtensionContext} context The extension context provided by VSCode.
 */
function CreateComponentCommand(context)
{
    if (createComponentDisposable)
    {
        createComponentDisposable.dispose();
    }
    createComponentDisposable = vscode.commands.registerCommand('extension.createComponent', createNewComponent);
    context.subscriptions.push(createComponentDisposable);
}

class Component
{
    /**
     * Creates a new Component instance.
     * 
     * @param {string?} name   The name of the component.
     * @param {boolean} mocked Indicates whether the component is mocked.
     * @param {boolean} tested Indicates whether the component is tested.
     */
    constructor(name, mocked, tested) 
    {
        this.name       = name;
        this.mocked     = mocked;
        this.tested     = tested;
    }
}

/**
 * Prompts the user to select properties for a component.
 * 
 * @param {Component} component The component for which to select properties.
 * 
 * @returns {Promise<Component|undefined>} The updated component, or undefined if the selection was cancelled.
 */
async function SelectComponentProperties(component)
{
    Logger.Info('Attempting to create a component');

    let componentName = await vscode.window.showInputBox({ prompt: 'Enter the name of the new component' });
    if (componentName !== undefined)
    {
        component.name = SanitizeFileName(componentName);
    }
    else
    {
        Logger.Warning('Unable to create a component: component name is required.');
        vscode.window.showWarningMessage('Component name is required.');
        return undefined;
    }

    // Define rest of the properties for selection
    const properties = 
    [
        { label: 'Mocked', value: 'mocked' },
        { label: 'Tested', value: 'tested' }
    ];

    // Pre-select items based on the component's current state
    properties.forEach(prop => 
    {
        if (component[prop.value]) 
        {
            prop.picked = true;
        }
    });

    const selectedProperties = await vscode.window.showQuickPick(properties, {
        canPickMany: true,
        placeHolder: 'Select component properties'
    });

    // if no selection, do not do anything
    if (!selectedProperties)
    {
        Logger.Error('No component properties were selected.');
        return undefined;
    }

    // Reset properties to false
    properties.forEach(prop => 
    {
        component[prop.value] = false;
    });

    // Update the component properties based on selection
    selectedProperties.forEach(selectedProp => 
    {
        component[selectedProp.value] = true;
    });

    return component;
}

/**
 * Composes a list of files to be created for a component.
 * 
 * @param {Component} component        The component to compose files for.
 * @param {string}    componentDirPath The directory path where the component files will be located.
 * @param {boolean}   isCpp            Should be true if the project is in C++
 * 
 * @returns {Array<{path: string, content: string}>} An array of file objects with path and content properties.
 */
function ComposeComponentFiles(component, componentDirPath, isCpp) 
{
    const headerNameExt = `${component.name}` + '.' + (isCpp ? 'hpp' : 'h');
    const sourceNameExt = `${component.name}` + '.' + (isCpp ? 'cpp' : 'c');

    let files = 
    [
        { path: path.join(componentDirPath, 'src',     sourceNameExt), content: fileContents.Source(component.name, isCpp)   },
        { path: path.join(componentDirPath, 'include', headerNameExt), content: fileContents.Header(component.name, isCpp)   },
        { path: path.join(componentDirPath, `CMakeLists.txt`),         content: fileContents.ComponentCmake(component.name, isCpp) },
    ];

    fs.mkdirSync(path.join(componentDirPath, "src"), { recursive: true });
    fs.mkdirSync(path.join(componentDirPath, "include"), { recursive: true });

    if (component.mocked)
    {
        files.push({ path: path.join(componentDirPath, 'mock', `mock_${sourceNameExt}`), content: fileContents.Mock(`${component.name}`, isCpp) });
        fs.mkdirSync(path.join(componentDirPath, 'mock'), { recursive: true });
    }

    if (component.tested)
    {
        files.push({ path: path.join(componentDirPath, 'test', `test_${headerNameExt}`), content: fileContents.TestHeader(`${component.name}`, isCpp) });
        files.push({ path: path.join(componentDirPath, 'test', `test_${sourceNameExt}`), content: fileContents.TestSource(`${component.name}`, isCpp) });
        fs.mkdirSync(path.join(componentDirPath, 'test'), { recursive: true });
    }

    return files;
}

/**
 * Prepares a directory for the component inside the "components" directory.
 * 
 * @param {Component} component The component for which to prepare the directory.
 * 
 * @returns {Promise<string|undefined>}
 * The path to the component directory, or undefined if the folder already exists.
 */
async function PrepareComponentDirectory(component)
{
    let componentDirPath = path.join(GetWorkspacePath(), 'Components', component.name);

    if (fs.existsSync(componentDirPath))
    {
        Logger.Error(`Component "${component.name}" already exists.`);
        vscode.window.showWarningMessage(`Component "${component.name}" already exists.`);
        return undefined;
    }

    fs.mkdirSync(componentDirPath, { recursive: true });

    return componentDirPath;
}

/**
 * Adds the newly created component to the main CMakeLists.txt.
 * 
 * @param {Component} component The component to register in the CMakeLists.txt.
 * 
 * @returns {Promise<void|undefined>}
 * A promise that resolves when the operation is complete, or undefined if CMakeLists.txt does not exist.
 */
async function RegisterComponentToMainCmake(component)
{
    // redundant because this check was moved to createNewComponent()
    let rootCmakeFilePath = path.join(GetWorkspacePath(), 'CMakeLists.txt');
    if (fs.existsSync(rootCmakeFilePath) === false)
    {
        Logger.Error(`Root CMakeLists.txt not found.`);
        vscode.window.showErrorMessage(`Root CMakeLists.txt not found.`);
        return undefined;
    }

    let rootCmakeContent = fs.readFileSync(rootCmakeFilePath).toString();

    // append the component to the COMPONENTS list
    let updatedCmakeContent = rootCmakeContent.replace(/(set\(COMPONENTS\s*\n)([^\)]*)\)/s, `$1$2\n  ${component.name})`);

    // create a string for the new options
    let newOptions = "";
    if (component.tested)
    {
        newOptions += `\noption(ENABLE_${component.name.toUpperCase()}_TEST "Enable testing for the ${component.name} component" OFF)`;
    }

    if (component.mocked)
    {
        newOptions += `\noption(ENABLE_${component.name.toUpperCase()}_MOCK "Enable mocking for the ${component.name} component" OFF)`;
    }

    // Check if '# Component build options' exists
    if (updatedCmakeContent.includes('# Component build options'))
    {
        // Add the new options after the comment '# Component build options'
        updatedCmakeContent = updatedCmakeContent.replace(/# Component build options/, `# Component build options${newOptions}`);
    }
    else
    {
        // Add the comment and the new options before the add_executable line
        updatedCmakeContent = updatedCmakeContent.replace(/add_executable\(/, `# Component build options${newOptions}\n\nadd_executable(`);
    }

    fs.writeFileSync(rootCmakeFilePath, updatedCmakeContent);
}

/**
 * Handles the creation of a new component.
 * 
 * @returns {Promise<void|undefined>}
 * A promise that resolves when the component is created, or undefined if the creation
 * was cancelled or the component already existed.
 */
async function createNewComponent()
{
    const isCpp = IsProjectCpp();

    let workspacePath = GetWorkspacePath();
    if (!workspacePath)
    {
        vscode.window.showErrorMessage("No folder open in the workspace");
        return undefined;
    }

    let rootCmakeFilePath = path.join(workspacePath, 'CMakeLists.txt');
    if (fs.existsSync(rootCmakeFilePath) === false)
    {
        vscode.window.showWarningMessage(`Root CMakeLists.txt not found.`);
        return undefined;
    }

    let component = new Component(undefined, false, false);

    await SelectComponentProperties(component);
    if (component.name === undefined) return undefined;

    let componentDirPath = await PrepareComponentDirectory(component);
    if (componentDirPath === undefined) return undefined;

    let files = ComposeComponentFiles(component, componentDirPath, isCpp);
    files.forEach(file => fs.writeFileSync(file.path, file.content));
    
    await RegisterComponentToMainCmake(component);

    Logger.Info(`Component ${component.name} created.`);
}

module.exports = CreateComponentCommand;