const {value} = that;
setTagMask(thisBot, "gametime", value);
globalThis.setGameTime?.(Math.floor(value));