const fs           = require('fs');
const path         = require('path');
const vscode       = require('vscode');
const fileContents = require('./FileContents');

let createComponentDisposable;

/**
 * @param {*} context 
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
     * @param {string?} name
     * @param {boolean} mocked
     * @param {boolean} tested
     */
    constructor(name, mocked, tested) 
    {
        this.name       = name;
        this.mocked     = mocked;
        this.tested     = tested;
    }
}

/**
 * 
 * @param {Component} component 
 * @returns 
 */
async function SelectComponentProperties(component)
{
    let componentName = await vscode.window.showInputBox({ prompt: 'Enter the name of the new component' });
    if (componentName !== undefined)
    {
        component.name = componentName;
    }
    else
    {
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
    if (!selectedProperties) return undefined;

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
 * 
 * 
 * @param {Component} component 
 * @param {string}    componentDirPath 
 * 
 * @returns 
 */
function ComposeComponentFiles(component, componentDirPath) 
{
    let files = 
    [
        { path: path.join(componentDirPath, 'src',     `${component.name}.c`), content: fileContents.Source(component.name)         },
        { path: path.join(componentDirPath, 'include', `${component.name}.h`), content: fileContents.Header(component.name)         },
        { path: path.join(componentDirPath, `CMakeLists.txt`),                 content: fileContents.ComponentCmake(component.name) },
    ];

    fs.mkdirSync(path.join(componentDirPath, "src"), { recursive: true });
    fs.mkdirSync(path.join(componentDirPath, "include"), { recursive: true });

    if (component.mocked)
    {
        files.push({ path: path.join(componentDirPath, 'mock', `mock_${component.name}.c`), content: fileContents.Mock(`${component.name}`) });
        fs.mkdirSync(path.join(componentDirPath, 'mock'), { recursive: true });
    }

    if (component.tested)
    {
        files.push({ path: path.join(componentDirPath, 'test', `test_${component.name}.h`), content: fileContents.TestHeader(`${component.name}`) });
        files.push({ path: path.join(componentDirPath, 'test', `test_${component.name}.c`), content: fileContents.TestSource(`${component.name}`) });
        fs.mkdirSync(path.join(componentDirPath, 'test'), { recursive: true });
    }

    return files;
}

/**
 * Creates a directory for the component inside the "components" directory
 * 
 * @param {Component} component 
 * 
 * @returns undefined if the component folder already exists
 */
async function PrepareComponentDirectory(component)
{
    let componentDirPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'Components', component.name);

    if (fs.existsSync(componentDirPath))
    {
        vscode.window.showWarningMessage(`Component "${component.name}" already exists.`);
        return undefined;
    }

    fs.mkdirSync(componentDirPath, { recursive: true });

    return componentDirPath;
}

/**
 * Adds the newly created component to the main CMakeLists.txt
 * 
 * @param {Component} component 
 * 
 * @returns undefined if CMakeLists.txt does not exist.
 */
async function RegisterComponentToMainCmake(component)
{
    let mainCmakeFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'CMakeLists.txt');
    if (fs.existsSync(mainCmakeFilePath) === false)
    {
        vscode.window.showWarningMessage(`Main CMakeLists.txt not found.`);
        return undefined;
    }

    let mainCmakeContent = fs.readFileSync(mainCmakeFilePath).toString();
    let newMainCmakeContent = mainCmakeContent.replace(/(set\(COMPONENTS\s*\n)([^\)]*)\)/s, `$1$2\n  ${component.name})`);
    fs.writeFileSync(mainCmakeFilePath, newMainCmakeContent);
}

/**
 * Creates a new component by asking the user about component name and properties
 * 
 * @returns undefined if component creation was cancelled or it already existed
 */
async function createNewComponent()
{
    let component = new Component(undefined, false, false);

    await SelectComponentProperties(component);
    if (component === undefined) return undefined;

    let componentDirPath = await PrepareComponentDirectory(component);
    if (componentDirPath === undefined) return undefined;

    let files = ComposeComponentFiles(component, componentDirPath);
    files.forEach(file => fs.writeFileSync(file.path, file.content));
    
    await RegisterComponentToMainCmake(component);
}

module.exports = CreateComponentCommand;