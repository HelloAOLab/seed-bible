const {state} = that;
setTagMask(thisBot, "gameState", state);
globalThis.setGameState?.(state);
shout("OnGameStateChanged", {state});