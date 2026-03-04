setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverBegin,
});
