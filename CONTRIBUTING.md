# Contributing Guideline

Hey there! Thanks a bunch for considering to contribute to my project. As of now
it's just me thinking of new stuff to add, finding bugs and fixing them. So any
help is appreciated. :D

This document gives a brief overview of the application structure, how it works
and where you can find the relevant files to contribute to.

## Code Overview

### Start of Code

The extension starts with the `activate()` function in the [`extension.js`][1]
file. The `activate` function creates the task bar buttons and calls the
`createStatusBarItem` function to put the buttons on the task bar. It then
registers the `Create New Project` and `Create New Component` commands.

### Status Bar Buttons

The `createStatusBarItem` function in `extension.js` registers different functions
for each function. These functions are bundled together in the [`ButtonActions.js`][2]
file. All the build related functions are therefore in this file.

### Project and Component Creation

The project creation is handled in the file [`ProjectManager.js`][3] and
component creation is handled in the file [`ComponentManager.js`][4].
Both of these files get the file contents that are written in the file
[`FileContents.js`][5].

### Build Tools

The detection and installation of build tools is done as soon as the extension
activates. It is being handled in the file [`ToolsManager.js`][6]

### Snippets

Snippets are all listed in [`c_snippets.json`][7].

### Utils

Some functions for common use like getting workspace path and OS type are
written in [`CommonUtils.js`][8].

## For Contributors

### Setting Up Development Environment

- [Install VSCode](https://code.visualstudio.com/download)
- [Install NodeJS](https://nodejs.org/en/download)
- Open the repo in VSCode
- Use `npm install` in terminal
- That's it.

### Code Style and Conventions

- Use allman style brackets
- Use camelCase
- Public functions must have their first letter capitalized
- Global constants must have all capital letters and underscore as separator

### Documentation

- Please add JSDoc style comments to allow as much type safety as possible
- Please use conventional commits
- Document your changes in a way that non-js developers can understand them

### Testing

- No compulsion to add unit tests, but would be appreciated
- Please test all features of the extension to make sure nothing was broken

### Code Review

- I'm not really a JS developer so as of now I don't have any specific code
  review things in mind.
- But I would like it if the code somewhat resembles C, since that's what I'm
  comfortable with.

[1]: ./extension.js
[2]: ./source/ButtonActions.js
[3]: ./source/ProjectManager.js
[4]: ./source/ComponentManager.js
[5]: ./source/FileContents.js
[6]: ./source/ToolsManager.js
[7]: ./source/c_snippets.json
[8]: ./source/CommonUtils.js
