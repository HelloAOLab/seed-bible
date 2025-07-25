const keys = [...(that?.keys || [])];
keys?.forEach(key => {
    if (!globalThis.KEY_HOLD) {
        globalThis.KEY_HOLD = {};
    }
    if (key.toLocaleLowerCase() === 'shift') {
        globalThis[`SetSelectPlaylist`](false);
    }
    delete globalThis.KEY_HOLD[key];
});
