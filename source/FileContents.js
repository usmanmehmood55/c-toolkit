const fileTypeEnum = 
{
    header: 'h',
    source: 'c',
};

/**
 * 
 * @param {string} componentName 
 * @returns 
 */
function ComponentCmake(componentName)
{
    let cmakeContent = 
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
        "target_include_directories(${PROJECT_NAME} PRIVATE ./include)";

    return cmakeContent;
}

/**
 * @param {string} componentName 
 * @param {string} fileType 
 * @param {string} prefix 
 * @returns 
 */
function DoxygenHeader(componentName, fileType, prefix)
{
    let fileName = `${componentName}.${fileType}`;
    if (prefix !== null)
    {
        fileName = `${prefix}_` + fileName;
    }
    
    let yourName    = "Your Name";
    let yourEmail   = "your-email@example.com";
    let companyName = "your company / association / school";

    let doxygenHeader = 
        "/**"                                                          + "\n" +
        ` * @file     ${fileName}`                                     + "\n" +
        ` * @author   ${yourName} (${yourEmail})`                      + "\n" +
        " * @brief    "                                                + "\n" +
        " * @version  0.1"                                             + "\n" +
        ` * @date     ${new Date().toISOString().split('T')[0]}`       + "\n" +
        " * "                                                          + "\n" +
        ` * Copyright (c) ${new Date().getFullYear()}, ${companyName}` + "\n" +
        " */";

    return doxygenHeader;
}

/**
 * @param {string} fileName 
 * @returns {string}
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
        `#endif // ${fileName.toUpperCase()}_H_`                + "\n" ;

    return content;
}

/**
 * 
 * @param {string} componentName 
 * @returns 
 */
function TestHeader(componentName)
{
    let content = 
        DoxygenHeader(componentName, fileTypeEnum.header, "test")         + "\n" +
        ""                                                                + "\n" +
        `#ifndef TEST_${componentName.toUpperCase()}_H_`                  + "\n" +
        `#define TEST_${componentName.toUpperCase()}_H_`                  + "\n" +
        ""                                                                + "\n" +
        `#warning \"test_${componentName} has not been implemented yet\"` + "\n" +
        ""                                                                + "\n" +
        `#endif // TEST_${componentName.toUpperCase()}_H_`                + "\n" ;

    return content;
}

/**
 * 
 * @param {string} componentName 
 * @returns 
 */
function TestSource(componentName)
{
    let content = 
        DoxygenHeader(componentName, fileTypeEnum.source, "test") + "\n" +
        ""                                                        + "\n" +
        `#include \"${componentName}.h\"`                         + "\n" +
        `#include \"test_${componentName}.h\"`                    + "\n" ;

    return content;
}

/**
 * @param {string} fileName 
 * @returns {string}
 */
function Source(fileName) 
{
    let content = 
        DoxygenHeader(fileName, fileTypeEnum.source, null) + "\n" +
        ""                                                 + "\n" +
        `#include \"${fileName}.h\"`                       + "\n" ;

    return content;
}

/**
 * @param {string} componentName 
 * @returns {string}
 */
function Mock(componentName) 
{
    let content = 
        DoxygenHeader(componentName, fileTypeEnum.source, "mock")           + "\n" +
        ""                                                                  + "\n" +
        `#include \"${componentName}.h\"`                                   + "\n" +
        ""                                                                  + "\n" +
        "// add functions here that mock the behaviour of your component"   + "\n";

    return content;
}

function ProjectCmake()
{
    let content = 

    "# Set the minimum CMake version"                                      + "\n" +
    "cmake_minimum_required(VERSION 3.10)"                                 + "\n" +
    ""                                                                     + "\n" +
    "get_filename_component(PROJECT_NAME ${CMAKE_CURRENT_LIST_DIR} NAME)"  + "\n" +
    "project(${PROJECT_NAME} VERSION 0.1 LANGUAGES ASM C)"                 + "\n" +
    ""                                                                     + "\n" +
    "set(CMAKE_EXPORT_COMPILE_COMMANDS ON)"                                + "\n" +
    ""                                                                     + "\n" +
    "set(CMAKE_C_FLAGS_DEBUG     \"-O0 -g3 --coverage -DDEBUG\")"          + "\n" +
    "set(CMAKE_CXX_FLAGS_DEBUG   \"-O0 -g3 --coverage -DDEBUG\")"          + "\n" +
    ""                                                                     + "\n" +
    "set(CMAKE_C_FLAGS_RELEASE   \"-O2\")"                                 + "\n" +
    "set(CMAKE_CXX_FLAGS_RELEASE \"-O2\")"                                 + "\n" +
    ""                                                                     + "\n" +
    "add_executable(${PROJECT_NAME} main.c)"                               + "\n" +
    ""                                                                     + "\n" +
    "# List of components"                                                 + "\n" +
    "set(COMPONENTS "                                                      + "\n" +
    "  )"                                                                  + "\n" +
    ""                                                                     + "\n" +
    "# Add component subdirectories using loop"                            + "\n" +
    "foreach(COMPONENT ${COMPONENTS})"                                     + "\n" +
    "    add_subdirectory(components/${COMPONENT})"                        + "\n" +
    "endforeach()"                                                         + "\n" +
    ""                                                                     + "\n" +
    "target_link_libraries(${PROJECT_NAME} gcov)"                          + "\n";

    return content;
}

function CppPropertiesJson()
{
    let content =
    
    "{"                                                                             + "\n" +
    "    \"configurations\":"                                                       + "\n" +
    "    ["                                                                         + "\n" +
    "        {"                                                                     + "\n" +
    "            \"name\"            : \"MinGW GCC\","                              + "\n" +
    "            \"includePath\"     : [ \"${workspaceFolder}/**\" ],"              + "\n" +
    "            \"compilerPath\"    : \"C:/msys64/mingw64/bin/gcc.exe\","          + "\n" +
    "            \"cStandard\"       : \"gnu17\","                                  + "\n" +
    "            \"cppStandard\"     : \"gnu++17\","                                + "\n" +
    "            \"intelliSenseMode\": \"windows-gcc-x64\","                        + "\n" +
    "            \"compileCommands\" : \"build/compile_commands.json\""             + "\n" +
    "        }"                                                                     + "\n" +
    "    ],"                                                                        + "\n" +
    "    \"version\": 4"                                                            + "\n" +
    "}"                                                                             + "\n";

    return content;
}

function LaunchJson()
{
    let content = 
    
    "{"                                                                                           + "\n" +
    "    \"configurations\": ["                                                                   + "\n" +
    "    {"                                                                                       + "\n" +
    "        \"name\"           : \"c-toolkit launch\","                                          + "\n" +
    "        \"type\"           : \"cppdbg\","                                                    + "\n" +
    "        \"request\"        : \"launch\","                                                    + "\n" +
    "        \"program\"        : \"${workspaceRoot}/build/${workspaceFolderBasename}.exe\","     + "\n" +
    "        \"args\"           : [],"                                                            + "\n" +
    "        \"stopAtEntry\"    : false,"                                                         + "\n" +
    "        \"cwd\"            : \"${workspaceRoot}\","                                          + "\n" +
    "        \"environment\"    : [],"                                                            + "\n" +
    "        \"externalConsole\": false,"                                                         + "\n" +
    "        \"MIMode\"         : \"gdb\","                                                       + "\n" +
    "        \"miDebuggerPath\" : \"C:/msys64/mingw64/bin/gdb.exe\","                             + "\n" +
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
    "        ]"                                                                                   + "\n" +
    "    }"                                                                                       + "\n" +
    "    ]"                                                                                       + "\n" +
    "}"                                                                                           + "\n";

    return content;
}

function SettingsJson()
{
    return ""; // no content for this file right now
}

function TasksJson()
{
    const content =

    "{"                                                                      + "\n" +
    "    \"version\": \"2.0.0\","                                            + "\n" +
    "    \"tasks\"  : "                                                      + "\n" +
    "    ["                                                                  + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"cmake_generate\","                           + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"command\": \"cmake -GNinja -Bbuild\""                     + "\n" +
    "        },"                                                             + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"ninja_build\","                              + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"command\": \"ninja -C build\""                            + "\n" +
    "        },"                                                             + "\n" +
    "        {"                                                              + "\n" +
    "            \"label\"  : \"run_executable\","                           + "\n" +
    "            \"type\"   : \"shell\","                                    + "\n" +
    "            \"command\": \"./build/${workspaceFolderBasename}.exe\""    + "\n" +
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
    "}"                                                                      + "\n";

    return content;
}

function MainSource()
{
    const content =

    "#include <stdio.h>"     + "\n" +
    "#include <stdint.h>"    + "\n" +
    ""                       + "\n" +
    "int main(void)"         + "\n" +
    "{"                      + "\n" +
    "    "                   + "\n" +
    "    return 0;"          + "\n" +
    "}"                      + "\n";

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