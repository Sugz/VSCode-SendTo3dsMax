// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const vscode = require('vscode');
	const winapi = require('./winapi');
	const path = require('path');

	const extensionName = "Send to 3dsMax";
	const notSupported = "File type not supported, must be of: *.ms, *.mcr, *.py";

	let _3dsMaxHwnd = undefined;

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


	let selectInstanceCommand = vscode.commands.registerCommand('send-to-3dsmax.select', async () => {
		const hwnd = await get3dsMaxWindowHwnd();
		if (hwnd !== null) {
			_3dsMaxHwnd = hwnd;
		}
	});

	let sendCommand = vscode.commands.registerCommand('send-to-3dsmax.send', async () => {
		if(vscode.window.activeTextEditor !== undefined) {
			const doc = vscode.window.activeTextEditor.document;

			// untitled document are not supported yet
			if(doc.isUntitled) {
				return;
			}

			// save dirty file
			if(doc.isDirty) {
				await doc.save();
			}

			// get the command to send to the listener. It depends if the file is a maxscript or python file.
			const cmd = getCmdFromFile(doc.fileName);
			if (cmd === null) {
				vscode.window.showInformationMessage(`${extensionName}: ${notSupported}`);
				return;
			}

			await sendCmd(cmd);
		}
	});

	context.subscriptions.push(selectInstanceCommand);
	context.subscriptions.push(sendCommand);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
