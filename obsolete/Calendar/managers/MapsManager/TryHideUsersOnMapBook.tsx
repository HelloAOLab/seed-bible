let { mapBook, mapBookData } = that;
if (!mapBookData) mapBookData = thisBot.GetMapElementData({ element: mapBook });
const currUsersColor = thisBot.GetUsersColorOnMapBook({ mapBookData });
currUsersColor.forEach((userColor) => {
  ObjectPooler.ReleaseObject({ obj: userColor, tag: userColor.tags.poolTag });
});
