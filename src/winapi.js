var exports = module.exports = {};
var ffi = require('ffi-napi');
var ref = require('ref-napi');

const maxTitle = "Autodesk 3ds Max";
const listenerClassName = "MXS_Scintilla";

const voidPtr = ref.refType(ref.types.void);
const stringPtr = ref.refType(ref.types.CString);

const user32 = ffi.Library('user32.dll', {
    EnumWindows: ['bool', [voidPtr, 'int32']],
    GetWindowTextA : ['long', ['long', stringPtr, 'long']],
	EnumChildWindows: ['bool', ['long', voidPtr, 'int32']],
	GetClassNameA : ['long', ['long', stringPtr, 'long']],
	SendMessageA: ['int32', [ 'long', 'int32', 'long', stringPtr]]
});


// return a buffer from a string converted as Cstring
function makeLPARAM(param) {
    if (param !== null) {
        return ref.allocCString(param);
    }
    return null;
}

exports.WM_SETTEXT = 0x000C;
exports.WM_CHAR = 0x0102;
exports.VK_RETURN = 0x0D;

exports.get3dsMaxWindowHwnds = function() {
    const windowItems = []

    // callback for EnumWindows. It loops against windows and check if the name contains "Autodesk 3ds Max"
    // eslint-disable-next-line no-unused-vars
    const windowProc = ffi.Callback('bool', ['long', 'int32'], (hwnd, lParam) => {
        const buf = Buffer.alloc(255);
        const ret = user32.GetWindowTextA(hwnd, buf, 255);
        if (ret > 0) {
            const name = ref.readCString(buf, 0);
            if(name.includes(maxTitle)) {
                // create a vscode pickable item for showQuickPick
                const item = {
                    label: name,
                    hwnd: hwnd,
                };
                windowItems.push(item);
            }
        }
        return true;
    });

    const success = user32.EnumWindows(windowProc, null);
    if (success && windowItems.length > 0) {
        return windowItems;
    }

    return null;
}


exports.get3dsMaxListener = function(maxHwnd) {
    const listeners = []

    // callback for EnumChildWindows. It loops against the current 3dsMax child windows and check the class name
    // eslint-disable-next-line no-unused-vars
    const enumChildProc = ffi.Callback('bool', ['long', 'int32'], (hwnd, lParam) => {
        const buf = Buffer.alloc(255);
        const ret = user32.GetClassNameA(hwnd, buf, 255);
        if (ret > 0) {
            const childClassName = ref.readCString(buf, 0);
            if(childClassName.includes(listenerClassName)) {
                listeners.push(hwnd)
            }
        }
        return true;
    });

    // we are only interested in the first result
    const success = user32.EnumChildWindows(maxHwnd, enumChildProc, null);
    if (success && listeners.length > 0) {
        return listeners[0];
    }

    return null;
}


exports.sendMessage = function(hwnd, msg, wparam, lparam) {
    user32.SendMessageA(hwnd, msg, wparam, makeLPARAM(lparam));
}