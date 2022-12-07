import * as ffi from 'ffi-napi';
import * as ref from 'ref-napi';

export const WM_SETTEXT = 0x000C;
export const WM_CHAR = 0x0102;
export const VK_RETURN = 0x0D;

const voidPtr = ref.refType(ref.types.void);
const stringPtr = ref.refType(ref.types.CString);

const user32 = ffi.Library('user32.dll', {
    EnumWindows: ['bool', [voidPtr, 'int32']],
    GetWindowTextA : ['long', ['long', stringPtr, 'long']],
	EnumChildWindows: ['bool', ['long', voidPtr, 'int32']],
	GetClassNameA : ['long', ['long', stringPtr, 'long']],
	SendMessageA: ['int32', [ 'long', 'int32', 'long', stringPtr]]
});


function makeLPARAM(param: string | null) {
    if (param !== null) {
        return ref.allocCString(param);
    }
    return null;
}


class WindowEnumeratorBase {
    hwnds: number[] = [];
    callback = ffi.Callback(
        'bool', ['long', 'int32'],
        (hwnd: number, lParam: number) => {
            this.hwnds.push(hwnd);
            return true;
        }
    );

    protected call?(): number[] | null;
}


class WindowEnumerator extends WindowEnumeratorBase {
    call(): number[] | null {
        if (user32.EnumWindows(this.callback, null)) {
            return this.hwnds;
        }
        return null;
    }
}


class ChildWindowEnumerator extends WindowEnumeratorBase {
    hwnd: number;

    constructor(hwnd: number) {
        super();
        this.hwnd = hwnd;
    }

    call(): number[] | null {
        if (user32.EnumChildWindows(this.hwnd, this.callback, null)) {
            return this.hwnds;
        }
        return null;
    }
}


export class Window {
    label: string | null = null;
    hwnd: number;

    constructor(hwnd: number, label?: string) {
        this.hwnd = hwnd;
        if(label !== undefined){
            this.label = label;
        }
        
    }

    findChild(className: string) : Window | null {
        const enumerator = new ChildWindowEnumerator(this.hwnd);
        const hwnds = enumerator.call();
        if (hwnds === null) {
            return null;
        }

        const child: Window | null = null;
        for (const hwnd of hwnds) {
            const buf = Buffer.alloc(255);
            const ret = user32.GetClassNameA(hwnd, buf, 255);
            if (ret > 0) {
                const childClassName = ref.readCString(buf, 0);
                if(childClassName.includes(className)) {
                    return new Window(hwnd);
                }
            }
        }
        return child;
    }

    sendMessage(msg: number, wparam: number, lparam: string | null) {
        user32.SendMessageA(this.hwnd, msg, wparam, makeLPARAM(lparam));
    }
}


export function getWindowsByTitle(title:string): Window[] | null {
    const windows: Window[] = [];
    const enumerator = new WindowEnumerator();
    const hwnds = enumerator.call();
    if (hwnds === null) {
        return null;
    }

    for (const hwnd of hwnds) {
        const buf = Buffer.alloc(255);
        const ret = user32.GetWindowTextA(hwnd, buf, 255);
        if (ret > 0) {
            const name = ref.readCString(buf, 0);
            if(name.includes(title)) {
                windows.push(new Window(hwnd, name));
            }
        }
    }

    return (windows.length > 0) ? windows : null;
}