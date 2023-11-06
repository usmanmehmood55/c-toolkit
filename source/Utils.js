const os     = require('os');
const vscode = require('vscode');
const path   = require('path');
const { execSync } = require('child_process');

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
 * Finds the path of the given program using the 'which' command.
 * 
 * @param {string} program The program to find.
 * 
 * @returns {string | undefined} The path to the program or undefined if not found.
 */
function FindProgramPath(program)
{
    try
    {
        const path = execSync(`which ${program}`, { encoding: 'utf-8' }).trim();
        return path;
    }
    catch (error)
    {
        return undefined;
    }
}

module.exports =
{
    FormatList,
    SanitizeFileName,
    OsTypes,
    CheckOs,
    WrapSpacedComponents,
    FindProgramPath,
};