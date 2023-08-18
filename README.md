# C Toolkit

A VSCode extension to help create, build, run, debug and test C projects
using CMake.

## Features

- Status bar buttons.
- Command for creating a new project.
- Command for generating a new component (library).

## Requirements

The following software must be installed for this extension to work properly.

1. GCC
2. GDB
3. CMake
4. Ninja

All 4 of these can be installed via [MSYS2](https://www.msys2.org/).

## Status Bar Buttons

Seven status bar buttons have been implemented to:

- Select build type (Release, Debug)
- Clean
- Build
- Run
- Debug
- Test
- Debug Test

## Project Generation
A new CMake project can be created with necessary biolerplate code using
the `C Toolkit: Create New Project` command in the command palette. To
access the command palette, use `ctrl + shift + p`.

It would then ask the user to select a base folder in which the project
folder is to be placed. When a base folder is selected, the user would be
asked to input the project name. 

### Project Files
The new project folder would contain these pre-configured items:
- .vscode folder
- CMakeLists.txt
- main.c

The user can then start adding their own libraries or "components" via the
component generation feature.

## Component Generation

A new component can be created with some biolerplate code by using the
`C Toolkit: Create New Component` command in the command palette. It 
would then ask the user to input the component name and give the option
to make the component "mocked" and "tested". 

### Mocked Components
"Mocked" means a mock file would be created inside a "mock" folder. If 
the component name is `library`, the mock file would be `mock_library.c`.

To enable mocking of this component, a variable named ENABLE_LIBRARY_MOCK
would have to be manually set in the root CMake.

### Tested Components
"Tested" means test header and source files would be created inside
a "test" folder. If the component name is `library` then the test files
would be `test_library.h` and `test_library.c`.

To enable testing of this component, a variable named ENABLE_LIBRARY_TEST
would have to be manually set in the root CMake.

### Component Files
A component would have the following files
- include/component.h
- src/component.c
- mock/mock_component.c
- test/test_component.h
- test/test_component.c
- CMakeLists.txt

It would also modify the root CMakeLists.txt to add the new component

## Building
I keep forgetting the build command. Use `vsce package` to build this
extension.