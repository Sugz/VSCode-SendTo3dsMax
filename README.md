# VSCode - Send to 3dsMax

This vscode extension allow to send maxscript and python code to 3dsMax.  
Based on the Sublime Text package [Sublime 3ds Max](https://github.com/cb109/sublime3dsmax).  
This extension works by iterating all opened windows and searching for Autodesk 3ds Max to find the MAXScript Listener handle, that then gets pasted the code or import command. 3ds Max is found and communicated with automatically. You can choose which one to talk to if there are multiple running instances of 3ds Max.

## Features

There is two differents commands:
- Send to 3dsMax: Execute the current file. If there is multiple 3dsMax instances, the user must first select one.
- Select 3dsMax instance: When using multiple 3dsMax instances, this command allow the user to select the instance to communicate with. User can change the instance by running this command again.

## Release Notes

### 0.1.0

Initial release.


