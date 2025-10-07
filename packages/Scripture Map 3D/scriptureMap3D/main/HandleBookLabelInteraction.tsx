const { bookLabel } = that;
const dimension = os.getCurrentDimension();

if (thisBot.masks.isAnimatingBible) return;

const layoutBookStructure = thisBot.GetBookStructureByChild({ bookLabel });
const layoutData = thisBot.GetLayoutDataById({
  layoutId: layoutBookStructure.layoutId,
});
if (
  !layoutBookStructure.layoutBookData.piece ||
  (layoutBookStructure.layoutBookData.isSelected &&
    !layoutData.currentPlaylistShownId)
) {
  const activeChaptersData =
    layoutBookStructure.layoutBookData.childrenData.filter((chapterData) => {
      return chapterData.piece;
    });
  if (activeChaptersData.length > 0) {
    const activeChapters = activeChaptersData.map((chapterData) => {
      return chapterData.piece;
    });
    ObjectPooler.ReleaseObject({
      obj: activeChapters,
      tag: activeChapters[0].tags.poolTag,
    });
    activeChaptersData.forEach((chapterData) => {
      chapterData.ResetData();
    });
  }
  const nameLabelPosition = getBotPosition(
    layoutBookStructure.nameLabel,
    dimension
  );

  const book = thisBot.SpawnBook({ layoutData, layoutBookStructure });

  const bookPositionMod = {
    [dimension + "X"]: nameLabelPosition.x,
    [dimension + "Y"]:
      nameLabelPosition.y -
      BibleVizUtils.Data.BibleLayoutMeasurements.BookLabelHeight / 2 -
      book.tags.scaleY / 2,
  };
  applyMod(book, bookPositionMod);

  animateTag(layoutBookStructure.layoutBookData.piece, {
    fromValue: {
      formOpacity: 0,
    },
    toValue: {
      formOpacity: 1,
    },
    duration: 0.007,
  });
}
