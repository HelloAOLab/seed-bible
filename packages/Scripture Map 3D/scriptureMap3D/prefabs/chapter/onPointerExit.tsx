setTagMask(thisBot, "hovered", false);
shout(`OnLayoutChapterInteracted`, {
  chapter: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverEnd,
});
