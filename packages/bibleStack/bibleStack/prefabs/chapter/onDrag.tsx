const chapterData = BibleStackManager.GetPieceData({piece: thisBot});
shout("OnChapterInteracted", {chapterData, dragInfo: that, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag});
os.enableCustomDragging();