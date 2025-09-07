setTagMask(thisBot, "isPointed", true)
const chapterData = BibleStackManager.GetPieceData({piece: thisBot});
shout("OnStackChapterInteracted", {chapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverBegin});