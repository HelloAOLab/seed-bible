ObjectPooler.ReleaseObject({obj: thisBot.links.background, tag: ObjectPoolTags.MapToggleBackground});
ObjectPooler.ReleaseObject({obj: thisBot.links.handle, tag: ObjectPoolTags.MapToggleHandle});

thisBot.tags.background = null;
thisBot.tags.handle = null;
thisBot.tags.mapId = null;
thisBot.tags.label = null;
thisBot.tags.isSettingsElement = null;
thisBot.tags.toggleType = null;