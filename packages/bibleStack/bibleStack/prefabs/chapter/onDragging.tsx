const chapterData = BibleStackManager.GetPieceData({piece: thisBot});
shout("OnChapterInteracted", {chapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Dragging, dragInfo: that});