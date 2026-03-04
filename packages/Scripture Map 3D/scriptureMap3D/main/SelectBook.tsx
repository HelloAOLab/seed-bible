const {
  layoutBookData,
  layoutData,
  fromOpenAllButton = false,
  chaptersMod = {},
} = that;

setTagMask(thisBot, "isAnimatingBible", true);

layoutBookData.isSelected = true;
const dimension = os.getCurrentDimension();
const bookPosition = getBotPosition(layoutBookData.piece, dimension);
const bookScales = BibleVizUtils.Functions.GetBotScales(layoutBookData.piece);
const chaptersOriginPosition = new Vector2(
  bookPosition.x - layoutBookData.piece.tags.scaleX / 2,
  bookPosition.y + layoutBookData.piece.tags.scaleY / 2
);
let column = 0;
let row = 0;
const chapterShowDuration = 0.03;

BibleVizUtils.Functions.TryHideUsersColorOnPiece({
  piece: layoutBookData.piece,
});
shout("OnBiblePieceSelected", { piece: layoutBookData.piece });

if (!fromOpenAllButton) {
  if (layoutData?.isCameraAnimationEnabled) {
    os.focusOn(
      { x: bookPosition.x, y: bookPosition.y, z: 0 },
      {
        rotation: { x: 0, y: 0, z: 0 },
        zoom: 18,
      }
    );
  }
  await animateTag(layoutBookData.piece, {
    fromValue: {
      formOpacity: 1,
      scaleX: bookScales.x,
      scaleY: bookScales.y,
    },
    toValue: {
      formOpacity: 0,
      scaleX: bookScales.x + 1,
      scaleY: bookScales.y + 1,
    },
    duration: fromOpenAllButton ? 0.005 : 0.3,
  }).finally(() => {
    setTagMask(layoutBookData.piece, "scaleX", bookScales.x);
    setTagMask(layoutBookData.piece, "scaleY", bookScales.y);
  });
}
layoutBookData.piece.tags[dimension] = false;
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const { relativeDateRange } =
  BibleVizUtils.Data.tags.booksStaticInfo[layoutBookData.pieceInfo.commonName];
const historicalDateRange = `${Math.abs(relativeDateRange.min)}${relativeDateRange.min != relativeDateRange.max ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`;
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`;

for (const chapterData of layoutBookData.childrenData) {
  const chapter = ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter,
  });
  const chapterMod = {
    [dimension]: true,
    [dimension + "X"]:
      chaptersOriginPosition.x +
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DWidth / 2 +
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DPadding +
      column *
        (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DWidth +
          BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DGap),
    [dimension + "Y"]:
      chaptersOriginPosition.y -
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight / 2 -
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DPadding -
      row *
        (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight +
          BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DGap),
    [dimension + "Z"]:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookPositionZ,
    scale: 0,
    scaleX: BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DWidth,
    scaleY: BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight,
    scaleZ:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.ChapterInitialScaleZ,
    initialScaleX:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DWidth,
    initialScaleY:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight,
    initialScaleZ:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.ChapterInitialScaleZ,
    selectedScaleZ:
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.ChapterSelectedScaleZ,
    desiredLabel:
      layoutBookData.piece.tags.startChapter + chapterData.pieceInfo.number,
    toErase: layoutBookData.piece.tags.toErase,
    initialColor: "#FFFFFF",
    historicalDateRange,
    elapsedYearsRange,
    labelFontSize: 0.5,
    parentBookName: layoutBookData.pieceInfo.commonName,
    arrangementIndex: layoutBookData.creationInfo.arrangementIndex,
    isYear: layoutData?.isDatesEnabled == 2 ? false : true,
    isShowYear: layoutData?.isDatesEnabled == 1 ? false : true,
    // layerIndex: chapterData.layerIndex,
    structureIndex: chapterData.structureIndex,
    chapterNumber: chapterData.pieceInfo.number,
    ...chaptersMod,
  };
  chapter.OnSpawned({ mod: chapterMod });
  chapterData.piece = chapter;
  chapterData.isActive = true;
  if (BibleVizUtils.Data.masks.isInHistoryMode)
    setTagMask(
      chapter,
      "color",
      BibleVizUtils.Functions.GetHistoryColor({ piece: chapter })
    );
  else if (chapterData.highlightColor)
    setTagMask(chapter, "color", chapterData.highlightColor);
  column += 1;

  if (
    column >=
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DMaxAmountOfColumns
  ) {
    column = 0;
    row += 1;
  }
}

if (fromOpenAllButton) {
  layoutBookData.childrenData.forEach((chapterData) => {
    setTag(chapterData.piece, "scale", 1);
    setTag(chapterData.piece, "label", chapterData.piece.tags.desiredLabel);
  });
  return true;
} else {
  return Promise.all(
    layoutBookData.childrenData.map((chapterData, index) => {
      return animateTag(chapterData.piece, "scale", {
        toValue: 1,
        duration: chapterShowDuration,
        startTime: os.localTime + index * chapterShowDuration * 1000,
      }).then(() => {
        setTag(chapterData.piece, "label", chapterData.piece.tags.desiredLabel);
      });
    })
  ).then(() => {
    shout("OnSelectLayoutBookComplete", { fromOpenAllButton });
  });
}
