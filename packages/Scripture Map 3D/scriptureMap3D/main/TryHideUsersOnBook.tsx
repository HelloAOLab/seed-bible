let { layoutBookData } = that;
const { book } = that;
if (!layoutBookData) layoutBookData = thisBot.GetPieceData({ piece: book });
const currUsersColor = thisBot.GetUsersColorOnlayoutBook({ layoutBookData });
currUsersColor.forEach((userColor: any) => {
  ObjectPooler.ReleaseObject({ obj: userColor, tag: userColor.tags.poolTag });
});
