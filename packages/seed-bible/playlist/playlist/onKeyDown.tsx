const keys = [...(that?.keys || [])];
keys?.forEach(key => {
    if (!globalThis.KEY_HOLD) {
        globalThis.KEY_HOLD = {};
    }
    globalThis.KEY_HOLD[key] = true;
    if (key.toLocaleLowerCase() === 'shift') {
        globalThis[`SetSelectPlaylist`](true);
    }
});