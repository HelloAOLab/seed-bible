const dimension = os.getCurrentDimension();
ColorLerper.StopLerp({
  bot: links.background,
  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.color,
});
animateTag(links.handle, dimension + "X", null);
