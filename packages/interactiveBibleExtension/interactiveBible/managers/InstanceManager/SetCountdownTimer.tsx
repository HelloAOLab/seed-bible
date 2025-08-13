const {value} = that;
setTagMask(thisBot, "countdownTimer", value);
globalThis.setCountdownTimer?.(Math.ceil(value));