# Change Log

## [v0.0.2](https://github.com/usmanmehmood55/c-toolkit/releases/tag/v0.0.2)

### Features

- Build tools detection - checks for missing build tools and notifies the user.
- Build tool installation - offers to install the missing tools using an
  appropriate package manager.
  
### Improvements

- Root CMakeLists.txt has appropriate optimization flags for Release, Debug and
  Test builds.
- Gcov is only linked if the build type is Test.

### Known Issues

- Extension doesn't activate when a folder isn't open in the workspace
- Creates a new component even if no project is present
- Unknown behaviour for multiple folders in the same workspace

## [v0.0.1](https://github.com/usmanmehmood55/c-toolkit/releases/tag/v0.0.1)

### Features

- Initial release
- Status bar buttons work
- A component can be generated
- A new project can be generated

### Known Issues

- Extension doesn't activate when a folder isn't open in the workspace
- Creates a new component even if no project is present
- Unknown behaviour for multiple folders in the same workspace
