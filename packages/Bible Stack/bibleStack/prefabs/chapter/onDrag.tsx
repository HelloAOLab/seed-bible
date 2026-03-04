const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
shout("OnStackChapterInteracted", {
  chapterData,
  dragInfo: that,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag,
});
os.enableCustomDragging();
