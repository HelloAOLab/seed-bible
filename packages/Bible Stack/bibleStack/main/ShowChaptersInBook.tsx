import { scriptureService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const { data, dimension } = that;

const biggerChapter = scriptureService.getBiggerChapter();
setTagMask(data.piece, "isShowingChapters", true);
for (const chapterData of data.childrenData) {
  const idx = data.childrenData.indexOf(chapterData);
  if (!chapterData.isActive) {
    const isSectionBookDataInstance =
      data instanceof StackSectionBookData ||
      data.constructor.name === "StackSectionBookData";
    const chapter = ObjectPooler.GetObjectFromPool({
      tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter,
    });
    const chapterDeltaDepth =
      (data.piece.masks.scaleY -
        chapter.tags.gapY * 2 -
        BibleVizDataRepository.getStackPieceMeasurement(
          "MinChapterBackDepth"
        )) *
      (chapterData.pieceInfo.amountOfVerses / biggerChapter);
    const chapterMod = {
      [dimension]: true,
      [dimension + "X"]: 0,
      [dimension + "Y"]: 0,
      [dimension + "Z"]: 0,
      creator: null,
      draggable: thisBot.masks.areBiblePiecesDraggable,
      index: idx,
      chapterNumber: idx + 1,
      chapterWidth:
        BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
      chapterHeight:
        BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
      arrangementIndex: data.piece.tags.arrangementIndex,
      parentBookName: data.piece.tags.bookName,
      scaleX: BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
      scaleY:
        BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
        chapterDeltaDepth,
      scaleZ: BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
      initialScaleX:
        BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
      initialScaleY:
        BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
        chapterDeltaDepth,
      initialScaleZ:
        BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
      selectedScaleY:
        BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
        chapterDeltaDepth +
        BibleVizDataRepository.getStackPieceMeasurement(
          "ChapterFrontSelectedDepth"
        ),
      label:
        idx +
        1 +
        ((isSectionBookDataInstance
          ? data.pieceBookInfo.startingIndex
          : data.pieceInfo.startingIndex) ?? 0),
    };

    chapter.OnSpawned({ mod: chapterMod });
    chapterData.piece = chapter;
    chapterData.isInsideBible = data.isInsideBible;
    chapterData.isInsideBook = true;
    chapterData.isActive = true;
    chapterData.isHidden = false;
    if (BibleVizUtils.Data.masks.isInHistoryMode)
      setTagMask(
        chapter,
        "color",
        BibleVizUtils.Functions.GetHistoryColor({ piece: chapter })
      );
  }
}
data.piece.TrySetChaptersPosition({ setX: true, setY: true, setZ: true });
