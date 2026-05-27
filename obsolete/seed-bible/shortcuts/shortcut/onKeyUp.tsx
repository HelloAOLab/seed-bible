const keys = [...(that?.keys || [])];

const multiSelectKeys = {
    'control': true,
    'meta': true
};

keys?.forEach(key => {
    if (!globalThis.SHORTCUT_KEYS) {
        globalThis.SHORTCUT_KEYS = {};
    }
    globalThis.SHORTCUT_KEYS[key.toLocaleLowerCase()] = false;
});
