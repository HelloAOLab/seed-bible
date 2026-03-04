const { modality } = that;
shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction:
    modality === BibleVizUtils.Data.tags.ClickModality.touch
      ? BibleVizUtils.Data.tags.InteractionType.Tap
      : BibleVizUtils.Data.tags.InteractionType.Click,
});
