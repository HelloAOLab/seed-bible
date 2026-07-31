const mainWord = getBot("isMainWord", true);
if (mainWord.masks.currentState === "bible") return;
if (globalThis.CLEARABLE_LERPING) {
  currentLerps.currentLerps.forEach((previousBotLerpData) => {
    currentLerps.ClearColorLerpData(previousBotLerpData);
    clearInterval(previousBotLerpData.lerpIntervalId);
    globalThis.CLEARABLE_LERPING = false;
  });
}
setTagMask(thisBot, "color", thisBot.tags.originalColor);
