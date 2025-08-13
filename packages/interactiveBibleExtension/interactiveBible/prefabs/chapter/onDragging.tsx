const chapterData = StacksManager.GetBibleElementData({element: thisBot});
shout("OnChapterInteracted", {chapterData, typeOfInteraction: StackElementInteractionType.Dragging, dragInfo: that});