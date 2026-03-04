setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverBegin,
});
