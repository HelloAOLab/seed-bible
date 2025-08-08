const chapterData = StacksManager.GetBibleElementData({element: thisBot});
shout("OnChapterInteracted", {chapterData, dragInfo: that, typeOfInteraction: StackElementInteractionType.Drag});
os.enableCustomDragging();