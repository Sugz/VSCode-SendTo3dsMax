
# <img src="SendTo3dsMax.png" width="30"/> VSCode - Send to 3dsMax

This vscode extension allow to send maxscript and python code to 3dsMax.  
Based on the Sublime Text package [Sublime 3ds Max](https://github.com/cb109/sublime3dsmax).  
This extension works by iterating all opened windows and searching for Autodesk 3ds Max to find the MAXScript Listener handle, that then gets pasted the code or import command. 3ds Max is found and communicated with automatically. You can choose which one to talk to if there are multiple running instances of 3ds Max.

## Features

There is two differents commands:

- *Send to 3dsMax:* Send the current file to the current 3dsMax instance. The file can be unsaved or dirty. User will have to pick an instance if none have been selected yet and multiple instance are running.
- *Send selection to 3dsMax:* Same as *Send to 3dsMax*, but limited to the current selection.
- *Select 3dsMax instance:* When multiple 3dsMax instances are running, this command allow the user to select one. User can change the instance by running this command again.

## Settings

- *Extend Selection:* "Extend current selection to the start of the first line and to the end of the last line when sending selected Maxscript."
- *Force local on selection:* Wrap the selected maxscript code in parenthesis before sending it to 3dsmax to make sure it stays local.
- *Force local on unsaved:* Wrap the unsaved maxscript code in parenthesis before sending it to 3dsmax to make sure it stays local.
- *Use temp for dirty file:* Use a temporary file instead of saving dirty file on send.

## Current Release

[0.1.5] - 2022-12-12 - [See changelog](https://github.com/Sugz/VSCode-SendTo3dsMax/blob/main/CHANGELOG.md)
