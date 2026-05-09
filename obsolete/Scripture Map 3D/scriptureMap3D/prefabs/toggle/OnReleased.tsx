ObjectPooler.ReleaseObject({
  obj: thisBot.links.background,
  tag: thisBot.links.background.tags.poolTag,
  log: true,
});
ObjectPooler.ReleaseObject({
  obj: thisBot.links.handle,
  tag: thisBot.links.handle.tags.poolTag,
  log: true,
});

thisBot.tags.background = null;
thisBot.tags.handle = null;
thisBot.tags.layoutId = null;
thisBot.tags.label = null;
thisBot.tags.isSettingsPiece = null;
thisBot.tags.toggleType = null;
