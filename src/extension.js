// imports
const vscode = require('vscode');
const fs = require('fs');

// temp files, one for "mxs", one for "py"
// deleted on deactivate()
const temp_files = {}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// lazy imports
	const winapi = require('./winapi');
	const path = require('path');
	const uniqueFilename = require('unique-filename')
	
	// constants
	const extensionName = "Send to 3dsMax";
	const notSupported = "File type not supported, must be of: *.ms, *.mcr, *.py";
	const operationCanceled = "Operation canceled"
	const tmpdir = path.join(context.extensionPath, 'tmp')

	// current 3dsMax instance hwnd
	let _3dsMaxHwnd = undefined;

	// get the current configuration values for given keys
	function getConfigValues(keys) {
		const values = []
		const config = vscode.workspace.getConfiguration("send-to-3dsmax");
		for (var key of keys){
			values.push(config[key])
		}
		return values
	}

	// get the appropriate command to send to 3dsMax based on the file extension
	function getCmdFromFile(file) {
		const ext = path.extname(file);
		if ([".ms", ".mcr"].includes(ext)) {
			return `fileIn @"${file}"\r\n`;
		}
		if (ext === ".py") {
			return `python.executeFile @"${file}"\r\n`;
		}
		return null;
	}

	// define the current 3dsMax instance to use 
	async function get3dsMaxWindowHwnd() {
		const windows = winapi.get3dsMaxWindowHwnds();
		if (windows === null) {
			vscode.window.showInformationMessage(`${extensionName}: No instance found`);
			return null;
		}

		if (windows.length > 1) {
			const pickedWindow = await vscode.window.showQuickPick(windows, { placeHolder: 'Select a 3dsMax instance' });
			if (pickedWindow === undefined) {
				vscode.window.showInformationMessage(`${extensionName}: No instance selected`);
				return;
			}
			vscode.window.showInformationMessage(`${extensionName}: selected "${pickedWindow.label}"`);
			return pickedWindow.hwnd;
		}

		return windows[0].hwnd;
	}

	// try to send the given command to the current 3dsMax instance
	async function sendCmd(cmd) {
		// make sure we have a 3dsmax instance selected
		if (_3dsMaxHwnd === undefined) {
			const window = await get3dsMaxWindowHwnd();
			if (window === null) {
				return;
			}

			_3dsMaxHwnd = window;
		}

		try {
			const listener = winapi.get3dsMaxListener(_3dsMaxHwnd);

			// the 3dsmax instance may have been close. Try again and refetch maxWindow
			if (listener === null) {
				throw new Error();
			}

			winapi.sendMessage(listener, winapi.WM_SETTEXT, 0, cmd);
			winapi.sendMessage(listener, winapi.WM_CHAR, winapi.VK_RETURN, null);

		}
		catch(e) {
			_3dsMaxHwnd = undefined;
			await sendCmd();
			return;
		}
	}

	// create and return a temporary file based on the document language
	async function getTempFile(doc, range = undefined) {
		// get the current language
		const lang = doc.languageId;
		let isMxs = lang.toUpperCase() == 'MAXSCRIPT';
		let isPy = lang.toUpperCase() == 'PYTHON';

		// if the language isn't maxscript or python, ask the user which one it is
		// TODO: cache chosen language for a given document ?
		if (!(isMxs || isPy)) {
			const pickedLang = await vscode.window.showQuickPick(
				['Maxscript', 'Python'], 
				{ title: 'Select Language' }
			);
			if (pickedLang === undefined) {
				vscode.window.showInformationMessage(`${extensionName}: ${operationCanceled}`);
				return;
			}
			isMxs = pickedLang.toUpperCase() == 'MAXSCRIPT';
			isPy = pickedLang.toUpperCase() == 'PYTHON';
		}

		// we generate unique temp files for a given vscode session, one for maxscript, one for python.
		// use either the existing one or create one.
		// these files are deleted when the extension is deactivated.
		let filename = undefined
		let data = undefined
		if (isMxs) {
			if(!('mxs' in temp_files)) {
				filename = `${uniqueFilename(tmpdir, 'vsc-send-to-max')}.ms`;
				temp_files['mxs'] = filename;
			}
			else {
				filename = temp_files['mxs'];
			}

			// check config and wrap the current text inside parenthesis to make sure everything is local in maxscript if necessary
			const forceLocalConfigs = getConfigValues(['forceLocalOnSelection', 'forceLocalOnUnsaved']);
			const forceLocalConfig = range !== undefined ? forceLocalConfigs[0] : forceLocalConfigs[1];
			data = forceLocalConfig ? `(\n${doc.getText(range)}\n)` : doc.getText(range);
		}
		else if (isPy) {
			if(!('py' in temp_files)) {
				filename = `${uniqueFilename(tmpdir, 'vsc-send-to-max')}.py`;
				temp_files['py'] = filename;
			}
			else {
				filename = temp_files['py'];
			}

			data = doc.getText(range);
		}
		
		// check if we need to create the temp folder
		// write the temp file to disk
		try {fs.mkdirSync(tmpdir); } catch (e) {}
		fs.writeFileSync(filename, data);

		return filename;
	}

	// return a range based on the current selection
	// starts at the first non whitespace character of the selection first line
	// ends at the last character of the selection last line
	function getExtendSelectionRange(editor) {
		const doc = editor.document;
		const selection = editor.selection;

		if (selection.isEmpty) {
			return undefined
		}

		const selectionLineStart = doc.lineAt(selection.start);
		const selectionLineEnd = doc.lineAt(selection.end);

		const newRangeStart = new vscode.Position(selectionLineStart.lineNumber, selectionLineStart.firstNonWhitespaceCharacterIndex);
		const newRangeEnd = new vscode.Position(selectionLineEnd.lineNumber, selectionLineEnd.range.end.character);
		return new vscode.Range(newRangeStart, newRangeEnd)
	}


	let selectInstanceCommand = vscode.commands.registerCommand('send-to-3dsmax.select', async () => {
		const hwnd = await get3dsMaxWindowHwnd();
		if (hwnd !== null) {
			_3dsMaxHwnd = hwnd;
		}
	});

	let sendCommand = vscode.commands.registerCommand('send-to-3dsmax.send', async () => {
		if(vscode.window.activeTextEditor !== undefined) {
			const doc = vscode.window.activeTextEditor.document;
			let file = undefined;

			// create a temp file if the current file isn't save
			if(doc.isUntitled) {
				file = await getTempFile(doc)
			}
			// save dirty file
			else if(doc.isDirty) {
				const useTempfile = getConfigValues(['useTempForDirtyFile'])[0];
				if (useTempfile) {
					file = await getTempFile(doc)
				}
				else {
					await doc.save();
					file = doc.fileName;
				}
			}

			// use current file
			else {
				file = doc.fileName;
			}

			// get the command to send to the listener. It depends if the file is a maxscript or python file.
			const cmd = getCmdFromFile(file);
			if (cmd === null) {
				vscode.window.showInformationMessage(`${extensionName}: ${notSupported}`);
				return;
			}

			await sendCmd(cmd);
		}
	});

	let sendSelectionCommand = vscode.commands.registerCommand('send-to-3dsmax.send-selection', async () => {
		const editor = vscode.window.activeTextEditor;
		if(editor !== undefined) {
			const extendSelection = getConfigValues(['extendSelection'])[0];
			let range = undefined;
			if (extendSelection) {
				range = getExtendSelectionRange(editor);
			}
			else {
				range = editor.selection;
			}

			if (range === undefined || range.isEmpty) {
				vscode.window.showInformationMessage(`${extensionName}: There is no active selection`);
				return;
			}

			const file = await getTempFile(editor.document, range)

			// get the command to send to the listener. It depends if the file is a maxscript or python file.
			const cmd = getCmdFromFile(file);
			if (cmd === null) {
				vscode.window.showInformationMessage(`${extensionName}: ${notSupported}`);
				return;
			}

			await sendCmd(cmd);
		}
	});

	context.subscriptions.push(selectInstanceCommand);
	context.subscriptions.push(sendCommand);
	context.subscriptions.push(sendSelectionCommand);
}

// Delete temporary files when the extension is deactivated
function deactivate() {
	for (var key in temp_files){
		fs.unlinkSync(temp_files[key]);
	}
}

module.exports = {
	activate,
	deactivate
}
