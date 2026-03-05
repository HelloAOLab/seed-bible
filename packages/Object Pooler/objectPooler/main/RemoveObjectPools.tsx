const { poolTags } = that;

for (const tag of poolTags) {
  if (!thisBot.vars.poolDictionary[tag]) continue;

  const pool = thisBot.vars.poolDictionary[tag];

  pool.inUseObjects.forEach((obj: any) => {
    thisBot.ReleaseObject({ obj, tag: obj.tags.poolTag });
  });

  pool.objectPool.forEach((obj: any) => {
    Destroy(obj);
  });

  thisBot.vars.poolDictionary[poolData.tag] = null;
}
