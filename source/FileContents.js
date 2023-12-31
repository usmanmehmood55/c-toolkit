const { OsTypes, CheckOs, FindProgramPath }  = require('./CommonUtils');

const fileTypeEnum = 
{
    header: 'h',
    source: 'c',
};

const LaunchJsonMiMode = 
{
    [OsTypes.WINDOWS] : 'gdb',
    [OsTypes.LINUX]   : 'gdb',
    [OsTypes.MACOS]   : 'lldb',
};

const intelliSenseMode = 
{
    [OsTypes.WINDOWS] : 'windows-gcc-x64',
    [OsTypes.LINUX]   : 'linux-gcc-x64',
    [OsTypes.MACOS]   : 'macos-gcc-x64',
};

/**
 * Creates a CMakeLists file for a component with references to its header, source, mock and test files.
 * 
 * @param {string} componentName Name of the component.
 * 
 * @returns {string} contents of component CmakeLists
 */
function ComponentCmake(componentName)
{
    let cmakeContent = 
        `# Start of ${componentName} CMakeLists.txt`                                                               + "\n" +
        ""                                                                                                         + "\n" +
        `set(CURRENT_DIR_NAME ${componentName})`                                                                   + "\n" +
        ""                                                                                                         + "\n" +
        `if(ENABLE_${componentName.toUpperCase()}_MOCK)`                                                           + "\n" +
        "    message(STATUS \"${CURRENT_DIR_NAME} is being mocked\")"                                              + "\n" +
        "    target_sources(${PROJECT_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/mock/mock_${CURRENT_DIR_NAME}.c)"  + "\n" +
        "else()"                                                                                                   + "\n" +
        "    target_sources(${PROJECT_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src/${CURRENT_DIR_NAME}.c)"        + "\n" +
        "endif()"                                                                                                  + "\n" +
        ""                                                                                                         + "\n" +
        `if(ENABLE_${componentName.toUpperCase()}_TEST)`                                                           + "\n" +
        "    message(STATUS \"${CURRENT_DIR_NAME} is being tested\")"                                              + "\n" +
        "    target_sources(${PROJECT_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/test/test_${CURRENT_DIR_NAME}.c)"  + "\n" +
        "    target_include_directories(${PROJECT_NAME} PRIVATE ./test)"                                           + "\n" +
        "endif()"                                                                                                  + "\n" +
        ""                                                                                                         + "\n" +
        "target_include_directories(${PROJECT_NAME} PRIVATE ./include)"                                            + "\n" +
        ""                                                                                                         + "\n" +
        `# End of ${componentName} CMakeLists.txt`                                                                 + "\n" ;

    return cmakeContent;
}

/**
 * Generates a Doxygen style file header containing the file, author, brief,
 * version, date and copyright tags.
 * 
 * @param {string} fileName Name of the component to generate file header for
 * @param {string} fileType File extension, can be .h or .c
 * @param {string} prefix   File name prefix for making headers for mock and test files
 * 
 * @returns {string} Doxygen style header
 */
function DoxygenHeader(fileName, fileType, prefix)
{
    let fullFileName = `${fileName}.${fileType}`;
    if (prefix !== null)
    {
        fullFileName = `${prefix}_` + fullFileName;
    }
    
    let yourName    = "Your Name";
    let yourEmail   = "your-email@example.com";
    let companyName = "your company / association / school";

    let doxygenHeader = 
        "/**"                                                           + "\n" +
        ` * @file      ${fullFileName}`                                 + "\n" +
        ` * @author    ${yourName} (${yourEmail})`                      + "\n" +
        " * @brief     your file's description"                         + "\n" +
        " * @version   0.1"                                             + "\n" +
        ` * @date      ${new Date().toISOString().split('T')[0]}`       + "\n" +
        ` * @copyright ${new Date().getFullYear()}, ${companyName}`     + "\n" +
        " */";

    return doxygenHeader;
}

/**
 * Generates a comment for the file indicating the E.O.F. (end of file)
 * 
 * @param {string} fileName Name of the component to generate file header for
 * @param {string} fileType File extension, can be .h or .c
 * @param {string} prefix   File name prefix for making headers for mock and test files
 * 
 * @returns {string} E.O.F. comment
 */
function FileEndComment(fileName, fileType, prefix)
{
    let fullFileName = `${fileName}.${fileType}`;
    if (prefix !== null)
    {
        fullFileName = `${prefix}_` + fullFileName;
    }

    return `// end of file ${fullFileName}`;
}

/**
 * Creates the main.c file containing inclusions for stdio and stdint, along
 * with an empty, zero returning main function.
 * 
 * @returns {string}  Contents of main.c
 */
function MainSource()
{
    let content =
        DoxygenHeader('main', fileTypeEnum.source, null) + "\n" +
        ""                                               + "\n" +
        "#include <stdio.h>"                             + "\n" +
        "#include <stdint.h>"                            + "\n" +
        ""                                               + "\n" +
        "int main(void)"                                 + "\n" +
        "{"                                              + "\n" +
        "    printf(\"\\rHello, World!\\n\");"           + "\n" +
        "    return 0;"                                  + "\n" +
        "}"                                              + "\n" +
        ""                                               + "\n" +
        "// end of file main.c"                          + "\n" ;

    return content;
}

/**
 * Creates the boilerplate code for a header file, containing its Doxygen header,
 * include guards and a compiler warning indicating that has not been implemented
 * yet.
 * 
 * @param {string} fileName Name of the file
 * 
 * @returns {string} boilerplate code
 */
function Header(fileName) 
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.header, null)      + "\n" +
        ""                                                      + "\n" +
        `#ifndef ${fileName.toUpperCase()}_H_`                  + "\n" +
        `#define ${fileName.toUpperCase()}_H_`                  + "\n" +
        ""                                                      + "\n" +
        `#warning \"${fileName} has not been implemented yet\"` + "\n" +
        ""                                                      + "\n" +
        `#endif // ${fileName.toUpperCase()}_H_`                + "\n" +
        ""                                                      + "\n" +
        FileEndComment(fileName, fileTypeEnum.source, null)     + "\n" ;

    return content;
}

/**
 * Creates the biolerplate code for a test header file, containing its Doxygen
 * header, include guards and a compiler warning indicating that it has not been
 * implemented yet.
 * 
 * @param {string} fileName Name of the file
 * 
 * @returns {string} boilerplate code
 * 
 * @todo Replace this with the Header function.
 */
function TestHeader(fileName)
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.header, "test")         + "\n" +
        ""                                                           + "\n" +
        `#ifndef TEST_${fileName.toUpperCase()}_H_`                  + "\n" +
        `#define TEST_${fileName.toUpperCase()}_H_`                  + "\n" +
        ""                                                           + "\n" +
        `#warning \"test_${fileName} has not been implemented yet\"` + "\n" +
        ""                                                           + "\n" +
        `#endif // TEST_${fileName.toUpperCase()}_H_`                + "\n" +
        ""                                                           + "\n" +
        FileEndComment(fileName, fileTypeEnum.source, "test")        + "\n" ;

    return content;
}

/**
 * Creates the biolerplate code for a test source file, containing its
 * Doxygen header, and inclusions of the test header and its own relevant
 * .h file.
 * 
 * @param {string} fileName Name of the file
 * 
 * @returns {string} boilerplate code
 */
function TestSource(fileName)
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.source, "test")  + "\n" +
        ""                                                    + "\n" +
        `#include \"${fileName}.h\"`                          + "\n" +
        `#include \"test_${fileName}.h\"`                     + "\n" +
        ""                                                    + "\n" +
        FileEndComment(fileName, fileTypeEnum.source, "test") + "\n" ;

    return content;
}

/**
 * Creates the boilerplate code for a source file, containing its Doxygen
 * header and inclusion of its relevant .h file.
 * 
 * @param {string} fileName Name of the file
 * 
 * @returns {string} boilerplate code
 */
function Source(fileName) 
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.source, null)  + "\n" +
        ""                                                  + "\n" +
        `#include \"${fileName}.h\"`                        + "\n" +
        ""                                                  + "\n" +
        FileEndComment(fileName, fileTypeEnum.source, null) + "\n" ;

    return content;
}

/**
 * Creates boilerplate code for a mock source file containing its Doxygen
 * header and inclusion of its relevant .h file.
 * 
 * @param {string} fileName Name of the file
 * 
 * @returns {string} boilerplate code
 */
function Mock(fileName) 
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.source, "mock")              + "\n" +
        ""                                                                + "\n" +
        `#include \"${fileName}.h\"`                                      + "\n" +
        ""                                                                + "\n" +
        "// add functions here that mock the behaviour of your component" + "\n" +
        ""                                                                + "\n" +
        FileEndComment(fileName, fileTypeEnum.source, "mock")             + "\n" ;

    return content;
}

/**
 * Creates a generic root CMakeLists.txt that contains some very basic
 * functionality and the "components" list variable.
 * 
 * @returns {string} CMakeLists.txt content
 */
function ProjectCmake()
{
    let content = 

    "# Start of root CMakeLists.txt"                                                      + "\n" +
    ""                                                                                    + "\n" +
    "cmake_minimum_required(VERSION 3.10)"                                                + "\n" +
    ""                                                                                    + "\n" +
    "# Setting the project name based on the root folder name"                            + "\n" +
    "get_filename_component(PROJECT_NAME ${CMAKE_CURRENT_LIST_DIR} NAME)"                 + "\n" +
    "project(${PROJECT_NAME} VERSION 0.1 LANGUAGES C)"                                    + "\n" +
    ""                                                                                    + "\n" +
    "set(CMAKE_EXPORT_COMPILE_COMMANDS ON)"                                               + "\n" +
    ""                                                                                    + "\n" +
    "# Common build flags"                                                                + "\n" +
    "set(CMAKE_C_FLAGS         \"-Wall -Wextra -std=c11\")"                               + '\n' +
    ""                                                                                    + "\n" +
    "# Individual build type flags"                                                       + "\n" +
    "set(CMAKE_C_FLAGS_RELEASE \"${CMAKE_C_FLAGS} -O2\")"                                 + "\n" +
    "set(CMAKE_C_FLAGS_DEBUG   \"${CMAKE_C_FLAGS} -O0 -g3\")"                             + "\n" +
    "set(CMAKE_C_FLAGS_TEST    \"${CMAKE_C_FLAGS} -O0 -g3 -D__test_build__ --coverage\")" + "\n" +
    ""                                                                                    + "\n" +
    "# List of components"                                                                + "\n" +
    "set(COMPONENTS "                                                                     + "\n" +
    "  )"                                                                                 + "\n" +
    ""                                                                                    + "\n" +
    "add_executable(${PROJECT_NAME} main.c)"                                              + "\n" +
    ""                                                                                    + "\n" +
    "# Add component subdirectories using loop"                                           + "\n" +
    "foreach(COMPONENT ${COMPONENTS})"                                                    + "\n" +
    "    add_subdirectory(components/${COMPONENT})"                                       + "\n" +
    "endforeach()"                                                                        + "\n" +
    ""                                                                                    + "\n" +
    "# Linking to coverage report tool in case of test build"                             + "\n" +
    "if(CMAKE_BUILD_TYPE MATCHES Test)"                                                   + "\n" +
    "    target_link_libraries(${PROJECT_NAME} gcov)"                                     + "\n" +
    "endif()"                                                                             + "\n" +
    ""                                                                                    + "\n" +
    "# Printing the size of build after building"                                         + "\n" +
    "add_custom_command(TARGET ${PROJECT_NAME} "                                          + "\n" +
    "    POST_BUILD COMMAND size $<TARGET_FILE:${PROJECT_NAME}>)"                         + "\n" +
    ""                                                                                    + "\n" +
    "# End of root CMakeLists.txt"                                                        + "\n" ;

    return content;
}

/**
 * Creates the c_cpp_properties.json file contents.
 * 
 * @returns {string} Contents of c_cpp_properties.json
 */
function CppPropertiesJson()
{
    const gccPath = FindProgramPath('gcc');

    let content =
    
    "{"                                                                             + "\n" +
    "    \"configurations\":"                                                       + "\n" +
    "    ["                                                                         + "\n" +
    "        {"                                                                     + "\n" +
    "            \"name\"            : \"c-toolkit config\","                       + "\n" +
    "            \"includePath\"     : [ \"${workspaceFolder}/**\" ],"              + "\n" +
    `            \"compilerPath\"    : \"${gccPath}\",`                             + "\n" +
    "            \"cStandard\"       : \"c11\","                                    + "\n" +
    "            \"cppStandard\"     : \"c++11\","                                  + "\n" +
    `            \"intelliSenseMode\": \"${intelliSenseMode[CheckOs()]}\",`         + "\n" +
    "            \"compileCommands\" : \"build/compile_commands.json\""             + "\n" +
    "        }"                                                                     + "\n" +
    "    ],"                                                                        + "\n" +
    "    \"version\": 4"                                                            + "\n" +
    "}"                                                                             + "\n" ;

    return content;
}

/**
 * Creates the launch.json file contents.
 * 
 * @returns {string}  Contents of launch.json
 */
function LaunchJson()
{
    const programPath = ('${workspaceRoot}/build/${workspaceFolderBasename}' + 
        ((CheckOs() === OsTypes.WINDOWS) ? '.exe' : ''));

    let contentStart = 
    
    "{"                                                                                           + "\n" +
    "    \"configurations\": ["                                                                   + "\n" +
    "    {"                                                                                       + "\n" +
    "        \"name\"           : \"c-toolkit launch\","                                          + "\n" +
    "        \"type\"           : \"cppdbg\","                                                    + "\n" +
    "        \"request\"        : \"launch\","                                                    + "\n" +
    `        \"program\"        : \"${programPath}\",`                                            + "\n" +
    "        \"args\"           : [],"                                                            + "\n" +
    "        \"stopAtEntry\"    : false,"                                                         + "\n" +
    "        \"cwd\"            : \"${workspaceRoot}\","                                          + "\n" +
    "        \"environment\"    : [],"                                                            + "\n" +
    "        \"externalConsole\": false,"                                                         + "\n" +
    `        \"MIMode\"         : \"${LaunchJsonMiMode[CheckOs()]}\",`                            + "\n" ;

    let contentMid =
    `        \"miDebuggerPath\" : \"gdb\",`                                                       + "\n" +
    "        \"setupCommands\"  : "                                                               + "\n" +
    "        ["                                                                                   + "\n" +
    "            {"                                                                               + "\n" +
    "                \"description\"   : \"Enable pretty-printing for gdb\","                     + "\n" +
    "                \"text\"          : \"-enable-pretty-printing\","                            + "\n" +
    "                \"ignoreFailures\": true"                                                    + "\n" +
    "            },"                                                                              + "\n" +
    "            {"                                                                               + "\n" +
    "                \"description\"   : \"Set Disassembly Flavor to Intel\","                    + "\n" +
    "                \"text\"          : \"-gdb-set disassembly-flavor intel\","                  + "\n" +
    "                \"ignoreFailures\": true"                                                    + "\n" +
    "            }"                                                                               + "\n" +
    "        ]"                                                                                   + "\n" ;

    let contentEnd =

    "    }"                                                                                       + "\n" +
    "    ]"                                                                                       + "\n" +
    "}"                                                                                           + "\n" ;

    let content = (CheckOs() === OsTypes.MACOS) ? 
        (contentStart + contentEnd) : (contentStart + contentMid + contentEnd);

    return content;
}

/**
 * Creates the settings.json file contents.
 * 
 * @returns {string}  Contents of settings.json
 */
function SettingsJson()
{
    return ""; // no content for this file right now
}

/**
 * Creates the tasks.json file contents.
 * 
 * @returns {string}  Contents of tasks.json
 */
function TasksJson()
{
    const programPath = ('./build/${workspaceFolderBasename}' +  
        ((CheckOs() === OsTypes.WINDOWS) ? '.exe' : ''));

    const content =

    "{"                                                                      + "\n" +
    "    \"version\": \"2.0.0\","                                            + "\n" +
    "    \"tasks\"  : "                                                      + "\n" +
    "    ["                                                                  + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"cmake_generate\","                           + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"command\": \"cmake -G Ninja -B build\""                   + "\n" +
    "        },"                                                             + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"ninja_build\","                              + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"command\": \"ninja -C build\""                            + "\n" +
    "        },"                                                             + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"run_executable\","                           + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    `            \"command\": \"${programPath}\"`                            + "\n" +
    "        },"                                                             + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"build_and_run\","                            + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"dependsOn\": "                                            + "\n" +
    "            ["                                                          + "\n" +
    "                \"cmake_generate\","                                    + "\n" +
    "                \"ninja_build\","                                       + "\n" +
    "                \"run_executable\""                                     + "\n" +
    "            ],"                                                         + "\n" +
    "            \"command\": \"echo All tasks executed successfully.\""     + "\n" +
    "        }"                                                              + "\n" +
    "    ]"                                                                  + "\n" +
    "}"                                                                      + "\n" ;

    return content;
}

module.exports = 
{
    ComponentCmake,
    Header,
    TestHeader,
    TestSource,
    Source,
    Mock,
    ProjectCmake,
    CppPropertiesJson,
    LaunchJson,
    SettingsJson,
    TasksJson,
    MainSource,
};