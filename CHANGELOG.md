# Change Log

## [v0.0.3](https://github.com/usmanmehmood55/c-toolkit/releases/tag/0.0.3)

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
