const bibleData = BibleStackManager.GetBibleDataById({
  stackBibleId: thisBot.tags.stackBibleId,
});
shout("TryStopStackVizToggle", { bibleData });
