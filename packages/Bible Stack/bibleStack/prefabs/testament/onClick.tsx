const { modality } = that;
shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction:
    modality === BibleVizUtils.Data.tags.ClickModality.touch
      ? BibleVizUtils.Data.tags.InteractionType.Tap
      : BibleVizUtils.Data.tags.InteractionType.Click,
});
