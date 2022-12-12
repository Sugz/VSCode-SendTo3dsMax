
# <img src="SendTo3dsMax.png" width="30"/> VSCode - Send to 3dsMax

This vscode extension allow to send maxscript and python code to 3dsMax.  
Based on the Sublime Text package [Sublime 3ds Max](https://github.com/cb109/sublime3dsmax).  
This extension works by iterating all opened windows and searching for Autodesk 3ds Max to find the MAXScript Listener handle, that then gets pasted the code or import command. 3ds Max is found and communicated with automatically. You can choose which one to talk to if there are multiple running instances of 3ds Max.

## Features

There is two differents commands:

- *Send to 3dsMax:* Send the current file to the current 3dsMax instance. User will have to pick an instance if none have been selected yet and multiple instance are running.
- *Select 3dsMax instance:* When multiple 3dsMax instances are running, this command allow the user to select one. User can change the instance by running this command again.

## Limitations

- Current file is save before it is send to 3dsMax.
- Unsaved files are unsuported for now.
- Send selection is unsuported for now.

## Current Release

[0.1.3] - 2022-12-12 - [See changelog](https://github.com/Sugz/VSCode-SendTo3dsMax/blob/main/CHANGELOG.md)
