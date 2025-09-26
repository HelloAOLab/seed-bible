const {
    prevItemName,
    nextItemName
} = that;

if (globalThis.SetItemsPlayer) {
    globalThis.SetItemsPlayer({
        prevItemName,
        nextItemName
    });
}

globalThis.prevItemName = prevItemName;
globalThis.nextItemName = nextItemName;