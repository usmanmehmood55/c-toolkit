# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are students and beginners setting up C or C++ projects in
Visual Studio Code, often before they fully understand GCC, GDB, CMake, Ninja,
and VS Code's project configuration files.

## Product Purpose

C C++ Toolkit reduces the setup and repetition involved in creating, building,
running, debugging, and testing normal CMake-based C and C++ projects. Success
means a beginner can get a structured project working while retaining a visible
path toward understanding and recreating the underlying commands themselves.

## Positioning

The extension is a productivity and learning layer over a conventional CMake
workflow, not a single-file runner or a custom build ecosystem. Its generated
projects remain understandable, editable, and usable without the extension.

## Operating Context

The extension runs inside Visual Studio Code on Windows, macOS, and Linux. It
generates projects and components, exposes frequent actions in the status bar,
uses CMake and Ninja for builds, integrates GCC/G++, GDB, and testing,
and can help bootstrap missing tools through platform package managers.

## Capabilities and Constraints

- Build output should default to a simplified sequence of meaningful events,
  with pending, active, passed, and failed states.
- Users must retain access to the real commands so they can inspect, copy, and
  recreate the workflow manually.
- The simplified-versus-command display preference remains fixed until the user
  changes it through a menu or setting; it does not change automatically.
- Ninja is the supported build generator.
- Opinionated defaults are intentional, while specialized build systems remain
  outside the primary product scope.

## Evidence on Hand

- The extension case study reports more than 22,000 Visual Studio Marketplace
  downloads.
- The repository README and source code document the current workflow and
  generated project structure.
- The user-provided case study is available in the current project discussion.

## Product Principles

- Reassure beginners without concealing the real build system.
- Teach through optional transparency rather than unavoidable noise.
- Prefer strong, predictable defaults over configuration breadth.
- Keep generated projects portable and understandable outside the extension.
- Turn failures into specific, actionable stages instead of an undifferentiated
  terminal transcript.
