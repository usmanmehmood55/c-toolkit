# C Toolkit

A VSCode extension to help create, build, run, debug and test C projects
using CMake.

## Features

- Status bar buttons.
- Checks for and installs missing build tools
- Command for creating a new project.
- Command for generating a new component (library).
- Snippets

## Important Note

Right now this is a beta / pre-release extension, with undoubtedly lots of bugs.
If you find a bug or have a suggestion, please [open a new issue](https://github.com/usmanmehmood55/c-toolkit/issues)
and help me make this extension better. :)

## Requirements

The following tools are required by extension to work properly. If they are not
installed, the extension attempts to install them by itself.

1. GCC
2. GDB
3. CMake
4. Ninja

## Status Bar Buttons

Seven status bar buttons have been implemented to:

- Select build type (Release, Debug)
- Clean
- Build
- Run
- Debug
- Test
- Debug Test

## Missing Build Tools

The extension checks if the required build tools are installed by trying to
execute `tool --version`. If the tool is not installed or is not included in
the `PATH`, the error is detected by the extension and it then offers to
install the missing tools.

![Asks the user for installation of tools](images/tools_ask_installation.PNG)

Once installation of the missing tools is complete, it asks the user if VSCode
can be restarted.

![Tools are installed](images/tools_installed.PNG)

The build tools are installed via these package managers:

- Advance Package Tool (APT) for Linux.
- Homebrew for MacOS.
- Scoop for Windows.

Since Windows does not come pre-installed with Scoop, the ability to install
Scoop itself has also been added. Once the tools are installed, the user is
informed, and asked to close and re-open VS Code.

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

## Snippets

The extension adds useful snippets for creating functions and attributes.

- functions
  - int (`intfunc`)
  - int8_t to int64_t (`int8func`, `int16func`, `int32func`, `int64func`)
  - uint8_t to uint64_t (`uint8func`, `uint16func`, `uint32func`, `uint64func`)
  - float (`flfunc`)
  - double (`doubfunc`)

- attributes
  - packed (`packed`)
  - aligned (`aligned`)
  - unused (`unused`)
  - weak (`weak`)
