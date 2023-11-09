# Change Log

## [v0.2.3](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.2.3)

### Improvements

- Added a [contributing guideline](./CHANGELOG.md)

### Fixes

- ~~Extension doesn't activate when a folder isn't open in the workspace.~~
  The extension now activates and works appropriately when no folder is
  open in the workspace.

## [v0.2.2](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.2.2)

### Improvements

- IntelliSense settings now have the correct GCC path.
- Added [Busybox](https://busybox.net/) to installation tools on Windows
  to access common Unix tools.

### Fixes

- On Windows, if the username had a space in it, eg `John Doe` instead of
  `JohnDoe` or `j.doe`, Scoop would not be detected, and any tools installed
  by Scoop would also not be detected. This has been fixed.

### Known Issues

- Extension doesn't activate when a folder isn't open in the workspace.

## [v0.2.1](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.2.1)

### Features

- Extension icon updated.
- Added git to installation tools.

### Improvements

- Added special cases in file and code generation for MacOS.
- Default build type set to Debug.
- Test build type also added in selection button.
- User can now provide sudo password for tool installation on Linux.
- Improved logs.

### Fixes

- Used LLDB instead GDB on MacOS, debugging works on MacOS now.
- Fixed tools installation on Linux.
- Scoop detection failing on systems with spaces in account username.

### Known Issues

- Extension doesn't activate when a folder isn't open in the workspace.

## [v0.1.3](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.1.3)

### Features

- Added snippets for common functions and attributes.

### Fixes

- Fixed tools detection and build invocation for folders with space in their paths.
- main.c was missing `#include <stdio.h>`, added back.

### Improvements

- Improved build marker handling. Now it is deleted before a new build to make sure
  a marker from the previous build is not taken as a build complete indication for
  the current build.

### Known Issues

- Cannot find Scoop installation if there is a space in `PATH`.
- GDB does not work on Apple's Arm64 architecture, so for that LLDB support will
  be added. For now an error message is popped up is the user tries to install
  GDB on MacOS.
- Extension doesn't activate when a folder isn't open in the workspace.
- Unknown behaviour for multiple folders in the same workspace.

## [v0.1.2](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.1.2)

### Features

- Filename sanitization: invalid characters for project name and filenames are
  converted into underscores and a warning pop-up is displayed about them.
- Every file has an ending comment, for better static analysis and also for AI
  tools.
- Added check for root CMake in createNewComponent() to prevent creation of a
  component if a CMake project is not open.
- If a component is mocked or tested, the relevant build options are also added
  in the root CMake.

### Fixes

- ~~Creates a new component even if no project is present~~: A new component is
  not created if the root folder doesn't contain a CMakeLists.txt file.

### Improvements

- Auto-generated root CMakeLists.txt is now more verbose and better organized.
- General improvements in managing builds and how different build types are
  handled.
- A root CMake parser has been added, but it is not being used for now.

### Known Issues

- Cannot find Scoop installation if there is a space in `PATH`.
- GDB does not work on Apple's Arm64 architecture, so for that LLDB support will
  be added. For now an error message is popped up is the user tries to install
  GDB on MacOS.
- Extension doesn't activate when a folder isn't open in the workspace.
- Unknown behaviour for multiple folders in the same workspace.

## [v0.1.0 and v0.1.1](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.1.0)

### Improvements

- Root CMakeLists.txt has a common `CMAKE_C_FLAGS` variable that enables all
  possible warnings and sets the language version to C11. This common variable
  is used by all three build types.

### Known Issues

- Cannot find Scoop installation if there is a space in `PATH`.
- GDB does not work on Apple's Arm64 architecture, so for that LLDB support will
  be added. For now an error message is popped up is the user tries to install
  GDB on MacOS.
- Extension doesn't activate when a folder isn't open in the workspace.
- Creates a new component even if no project is present.
- Unknown behaviour for multiple folders in the same workspace.

## [v0.0.2](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.0.2)

### Features

- Build tools detection - checks for missing build tools and notifies the user.
- Build tool installation - offers to install the missing tools using an
  appropriate package manager:
  - Advance Package Tool (APT) for Linux.
  - Homebrew for MacOS.
  - Scoop for Windows.

### Improvements

- Root CMakeLists.txt has appropriate optimization flags for Release, Debug and
  Test builds.
- Gcov is only linked if the build type is Test.

### Known Issues

- GDB does not work on Apple's Arm64 architecture, so for that LLDB support will
  be added. For now an error message is popped up is the user tries to install
  GDB on MacOS.
- Extension doesn't activate when a folder isn't open in the workspace.
- Creates a new component even if no project is present.
- Unknown behaviour for multiple folders in the same workspace.

## [v0.0.1](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.0.1)

### Features

- Initial release
- Status bar buttons work
- A component can be generated
- A new project can be generated

### Known Issues

- Extension doesn't activate when a folder isn't open in the workspace
- Creates a new component even if no project is present
- Unknown behaviour for multiple folders in the same workspace
