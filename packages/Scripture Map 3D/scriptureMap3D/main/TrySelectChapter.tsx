const { chapterData, layoutData } = that;

chapterData.isSelected = true;
shout("OnBiblePieceSelected", { piece: chapterData.piece });
if (layoutData?.isPathEnabled) {
  if (layoutData.currentSelectedChapterData) {
    layoutData.currentSelectedChapterData.piece.tags.lineTo =
      chapterData.piece.tags.id;
    layoutData.currentSelectedChapterData.piece.tags.lineWidth = 4;
    layoutData.currentSelectedChapterData.piece.tags.lineColor =
      layoutData.chapterSelectColor;
  }
  layoutData.currentSelectedChapterData = chapterData;
}
if (layoutData?.isCameraAnimationEnabled) {
  const dimension = os.getCurrentDimension();
  os.focusOn(
    {
      x: chapterData.piece.tags[dimension + "X"] + 1,
      y: chapterData.piece.tags[dimension + "Y"] + 1,
      z: 1.5,
    },
    { rotation: { x: 0.3, y: 0.3, z: 0 } }
  );
}
BibleVizUtis.Functions.TryHideUsersNotificationOnPiece({
  piece: chapterData.piece,
});
return chapterData.piece.Select({ layoutData });
