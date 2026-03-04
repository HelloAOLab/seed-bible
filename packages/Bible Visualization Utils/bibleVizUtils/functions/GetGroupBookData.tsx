const { bookLayout, sectionPosition = new Vector3(0, 0, 0) } = that;

let groupBookScaleX,
  groupBookPositionX,
  groupBookLayoutPositionX,
  groupBookScaleY,
  groupBookPositionY,
  groupBookLayoutPositionY;

groupBookScaleX =
  BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.x *
  (bookLayout.x.to - bookLayout.x.from);
groupBookPositionX = sectionPosition.x;
if (bookLayout.x.from === 0 && bookLayout.x.to !== 1) {
  groupBookScaleX -= BibleVizUtils.Data.tags.StackSpacing.BetweenBooks / 2;
  groupBookLayoutPositionX =
    groupBookScaleX / 2 -
    BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.x / 2;
  groupBookPositionX += groupBookLayoutPositionX;
} else if (bookLayout.x.from !== 0 && bookLayout.x.to === 1) {
  groupBookScaleX -= BibleVizUtils.Data.tags.StackSpacing.BetweenBooks / 2;
  groupBookLayoutPositionX =
    BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.x / 2 -
    groupBookScaleX / 2;
  groupBookPositionX += groupBookLayoutPositionX;
} else {
  groupBookLayoutPositionX = 0;
}

groupBookScaleY =
  BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.y *
  (bookLayout.y.to - bookLayout.y.from);
groupBookPositionY = sectionPosition.y;
if (bookLayout.y.from === 0 && bookLayout.y.to !== 1) {
  groupBookScaleY -= BibleVizUtils.Data.tags.StackSpacing.BetweenBooks / 2;
  groupBookLayoutPositionY =
    groupBookScaleY / 2 -
    BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.y / 2;
  groupBookPositionY += groupBookLayoutPositionY;
} else if (bookLayout.y.from !== 0 && bookLayout.y.to === 1) {
  groupBookScaleY -= BibleVizUtils.Data.tags.StackSpacing.BetweenBooks / 2;
  groupBookLayoutPositionY =
    BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.y / 2 -
    groupBookScaleY / 2;
  groupBookPositionY += groupBookLayoutPositionY;
} else {
  groupBookLayoutPositionY = 0;
}

return {
  groupBookScaleX,
  groupBookScaleY,
  groupBookPositionX,
  groupBookPositionY,
  groupBookLayoutPositionX,
  groupBookLayoutPositionY,
};
