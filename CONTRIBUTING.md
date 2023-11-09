# Contributing Guideline

Hey there! Thanks a bunch for considering to contribute to my project. As of now
it's just me thinking of new stuff to add, finding bugs and fixing them. So any
help is appreciated. :D

This document gives a brief overview of the application structure, how it works
and where you can find the relevant files to contribute to.

## Start of Code

The extension starts with the `activate()` function in the [`extension.js`][1]
file. The `activate` function creates the task bar buttons and calls the
`createStatusBarItem` function to put the buttons on the task bar. It then
registers the `Create New Project` and `Create New Component` commands.

## Status Bar Buttons

The `createStatusBarItem` function in `extension.js` registers different functions
for each function. These functions are bundled together in the [`ButtonActions.js`][2]
file. All the build related functions are therefore in this file.

## Project and Component Creation

The project creation is handled in the file [`ProjectManager.js`][3] and
component creation is handled in the file [`ComponentManager.js`][4].
Both of these files get the file contents that are written in the file
[`FileContents.js`][5].

## Build Tools

The detection and installation of build tools is done as soon as the extension
activates. It is being handled in the file [`ToolsManager.js`][6]

## Snippets

Snippets are all listed in [`c_snippets.json`][7].

## Utils

Some functions for common use like getting workspace path and OS type are
written in [`CommonUtils.js`][8].

[1]: ./extension.js
[2]: ./source/ButtonActions.js
[3]: ./source/ProjectManager.js
[4]: ./source/ComponentManager.js
[5]: ./source/FileContents.js
[6]: ./source/ToolsManager.js
[7]: ./source/c_snippets.json
[8]: ./source/CommonUtils.js
