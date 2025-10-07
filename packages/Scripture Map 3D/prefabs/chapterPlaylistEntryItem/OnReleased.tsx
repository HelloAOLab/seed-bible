thisBot.vars.nodes?.forEach?.((node) => {
  ObjectPooler.ReleaseObject({
    obj: node,
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapChapterPlaylistEntryNode,
  });
});

thisBot.tags.lineTo = null;
thisBot.tags.color = "white";
thisBot.vars.nodes = null;
