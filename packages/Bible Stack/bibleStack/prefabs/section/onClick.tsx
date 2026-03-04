const { modality } = that;
shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction:
    modality === BibleVizUtils.Data.tags.ClickModality.touch
      ? BibleVizUtils.Data.tags.InteractionType.Tap
      : BibleVizUtils.Data.tags.InteractionType.Click,
});
