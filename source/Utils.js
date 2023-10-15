const vscode = require('vscode');

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

module.exports =
{
    FormatList,
    SanitizeFileName
};