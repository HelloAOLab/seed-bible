thisBot.vars.nodes?.forEach?.((node) => {
  ObjectPooler.ReleaseObject({ obj: node, tag: node.tags.poolTag });
});

thisBot.tags.lineTo = null;
thisBot.tags.color = "white";
thisBot.vars.nodes = null;
