const chapterData = StacksManager.GetBibleElementData({element: thisBot});
shout("OnChapterInteracted", {chapterData, typeOfInteraction: StackElementInteractionType.HoverBegin});