const chapterData = BibleStackManager.GetPieceData({piece: thisBot});
shout("OnStackChapterInteracted", {chapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverEnd});