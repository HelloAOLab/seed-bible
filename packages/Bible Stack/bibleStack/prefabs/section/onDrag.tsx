shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag,
  dragInfo: that,
});
os.enableCustomDragging();
