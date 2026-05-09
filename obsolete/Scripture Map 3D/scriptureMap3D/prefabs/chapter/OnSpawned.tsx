const { mod } = that;

clearAnimations(thisBot);
clearTagMasks(thisBot);
applyMod(thisBot, mod);
shout(`OnMapChapterSpawned`, {
  coverId: thisBot.tags.creator,
  chapter: thisBot,
});
