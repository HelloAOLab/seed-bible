const dimension = os.getCurrentDimension();
LerpColorManager.StopColorLerp({bot: links.background, tag: InterpolatableColorTags.color});
animateTag(links.handle, dimension + "X", null);