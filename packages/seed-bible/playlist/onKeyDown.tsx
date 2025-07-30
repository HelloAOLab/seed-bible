const keys = [...(that?.keys || [])];

const multiSelectKeys = {
    'control': true,
    'meta': true
};

console.log("Key Press!!")

keys?.forEach(key => {
    if (!globalThis.KEY_HOLD) {
        globalThis.KEY_HOLD = {};
    }
    globalThis.KEY_HOLD[key.toLocaleLowerCase()] = true;
    if (multiSelectKeys[key.toLocaleLowerCase()]) {
        globalThis[`SetSelectPlaylist`] && globalThis[`SetSelectPlaylist`](true);
        globalThis[`SetChecklistEnabled`] && globalThis[`SetChecklistEnabled`](true);
    }
});