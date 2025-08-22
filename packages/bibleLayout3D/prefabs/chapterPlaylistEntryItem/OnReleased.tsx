thisBot.vars.nodes?.forEach?.((node) => {
    ObjectPooler.ReleaseObject({obj: node, tag: ObjectPoolTags.MapChapterPlaylistEntryNode})
})

thisBot.tags.lineTo = null;
thisBot.tags.color = "white";
thisBot.vars.nodes = null;