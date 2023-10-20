// #include <stdio.h> // sorry force of habit, it looked weird without this.

class RootCMake
{
    constructor()
    {
        /** @type {string?} */
        this.StartOfFileComment = null;

        /** @type {string?} */
        this.VersionLine = null;

        /** @type {string?} */
        this.ProjectNameComment = null;

        /** @type {string[]?} */
        this.ProjectNameLines = null;

        /** @type {string?} */
        this.CompileCommandsLine = null;

        /** @type {string?} */
        this.CommonBuildFlagsComment = null;

        /** @type {string?} */
        this.CommonBuildFlagsLine = null;

        /** @type {string?} */
        this.IndividualBuildFlagsComment = null;

        /** @type {string[]?} */
        this.IndividualBuildFlagsLines = null;

        /** @type {string?} */
        this.ComponentListComment = null;

        /** @type {string[]?} */
        this.ComponentListLines = null;

        /** @type {string?} */
        this.ComponentBuildOptionsComment = null;

        /** @type {string[]?} */
        this.ComponentBuildOptionsLines = null;

        /** @type {string?} */
        this.AddExecutableLine = null;

        /** @type {string?} */
        this.ComponentForeachComment = null;

        /** @type {string[]?} */
        this.ComponentForeachLines = null;

        /** @type {string?} */
        this.GcovLinkComment = null;

        /** @type {string[]?} */
        this.GcovLinkLines = null;

        /** @type {string?} */
        this.SizeCommandComment = null;

        /** @type {string[]?} */
        this.SizeCommandLines = null;

        /** @type {string?} */
        this.EndOfFileComment = null;
    }

    /**
     * Parses CMake
     * @param {string} rootCmake Contents of root CMakeLists.txt
     */
    parse(rootCmake)
    {
        const lines = rootCmake.split('\n').map(line => line.trim());

        this.VersionLine         = findLineStartsWith(lines, "cmake_minimum_required");
        this.ProjectNameLines    = parseProjectNameLines(lines);
        this.CompileCommandsLine = findLineStartsWith(lines, "set(CMAKE_EXPORT_COMPILE_COMMANDS");
        this.CommonBuildFlagsLine       = findLineStartsWith(lines, "set(CMAKE_C_FLAGS");
        this.IndividualBuildFlagsLines  = parseIndividualBuildFlagsLines(lines);
        this.ComponentListLines         = parseComponentListLines(lines);
        this.ComponentBuildOptionsLines = parseComponentBuildOptionsLines(lines);
        this.AddExecutableLine          = findLineStartsWith(lines, "add_executable(");
        this.ComponentForeachLines = parseComponentForeachLines(lines);
        this.GcovLinkLines         = parseGcovLinkLines(lines);
        this.SizeCommandLines      = parseSizeCommandLines(lines);
    }
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseProjectNameLines(lines)
{
    const projectNameStart = findLineIndexStartsWith(lines, "get_filename_component");
    const projectNameEnd = findLineIndexStartsWith(lines, "project(") + 1;

    return (projectNameStart !== -1 && projectNameEnd !== 0) ?
        extractBlockBetween(lines, projectNameStart, projectNameEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseIndividualBuildFlagsLines(lines)
{
    const individualBuildFlagsStart = findLineIndexStartsWith(lines, "set(CMAKE_C_FLAGS_RELEASE");
    const individualBuildFlagsEnd = findLineIndexStartsWith(lines, "set(CMAKE_C_FLAGS_TEST") + 1;

    return (individualBuildFlagsStart !== -1 && individualBuildFlagsEnd !== 0) ?
        extractBlockBetween(lines, individualBuildFlagsStart, individualBuildFlagsEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseComponentListLines(lines)
{
    const componentListStart = findLineIndexStartsWith(lines, "set(COMPONENTS");
    const componentListEnd = lines.findIndex((line, index) => line.endsWith(")") && index > componentListStart) + 1;

    return (componentListStart !== -1 && componentListEnd !== 0) ?
        extractBlockBetween(lines, componentListStart, componentListEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseComponentBuildOptionsLines(lines)
{
    const componentBuildOptionsStart = findLineIndexStartsWith(lines, "option(ENABLE_COMPONENT_3_TEST");
    const componentBuildOptionsEnd = findLineIndexStartsWith(lines, "option(ENABLE_COMPONENT_4_TEST") + 1;

    return (componentBuildOptionsStart !== -1 && componentBuildOptionsEnd !== 0) ?
        extractBlockBetween(lines, componentBuildOptionsStart, componentBuildOptionsEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseComponentForeachLines(lines)
{
    const componentForeachStart = findLineIndexStartsWith(lines, "foreach(COMPONENT");
    const componentForeachEnd = findLineIndexStartsWith(lines, "endforeach()") + 1;

    return (componentForeachStart !== -1 && componentForeachEnd !== 0) ?
        extractBlockBetween(lines, componentForeachStart, componentForeachEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseGcovLinkLines(lines)
{
    const gcovLinkStart = findLineIndexStartsWith(lines, "if(CMAKE_BUILD_TYPE MATCHES Test)");
    const gcovLinkEnd = findLineIndexStartsWith(lines, "endif()") + 1;

    return (gcovLinkStart !== -1 && gcovLinkEnd !== 0) ?
        extractBlockBetween(lines, gcovLinkStart, gcovLinkEnd) : null;
}

/**
 * 
 * @param {string[]} lines 
 * @returns {string[]?}
 */
function parseSizeCommandLines(lines)
{
    const sizeCommandStart = findLineIndexStartsWith(lines, "add_custom_command(TARGET");
    const sizeCommandEnd = findLineIndexStartsWith(lines, "POST_BUILD COMMAND size") + 1;

    return (sizeCommandStart !== -1 && sizeCommandEnd !== 0) ?
        extractBlockBetween(lines, sizeCommandStart, sizeCommandEnd) : null;
}

/**
 * Extract content between two line numbers
 * 
 * @param {string[]} lines    lines array
 * @param {number}   startIdx start index
 * @param {number}   endIdx   end index
 * 
 * @returns {string[]} block of lines or null
 */
function extractBlockBetween(lines, startIdx, endIdx)
{
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx)
    {
        return null;
    }

    return lines.slice(startIdx, endIdx);
}

/**
 * Find line by starting content
 * 
 * @param {string[]} lines   lines array
 * @param {string}   content search content
 * 
 * @returns {string|null} Line or null
 */
function findLineStartsWith(lines, content)
{
    const line = lines.find(line => line.startsWith(content));
    return line ? line : null;
}

/**
 * Find index of line by starting content
 * 
 * @param {string[]} lines lines array
 * @param {string}   content search content
 * 
 * @returns {number} line number or -1
 */
function findLineIndexStartsWith(lines, content)
{
    const index = lines.findIndex(line => line.startsWith(content));
    return index !== -1 ? index : -1;
}

module.exports =
{
    RootCMake
};
