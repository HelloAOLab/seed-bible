import { scriptureService } from "bibleVizUtils.services.index";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

const {
  data,
  dimension,
}: {
  data: StackSectionBookData | StackBookData;
  dimension: string;
} = that;

if (!data.piece) {
  console.warn("data.piece not found at ShowChaptersInBook");
  return;
}

const biggerChapter = scriptureService.getBiggerChapter();
setTagMask(data.piece, "isShowingChapters", true);
const isSectionBookDataInstance =
  data instanceof StackSectionBookData ||
  data.constructor.name === "StackSectionBookData";
const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
  (isSectionBookDataInstance
    ? (data as StackSectionBookData).pieceBookInfo
    : (data as StackBookData).pieceInfo
  ).commonName
);

if (!bookStaticInfo) {
  console.error(`bookStaticInfo not found at ShowChaptersInBook`);
  return;
}

const startingIndex = bookStaticInfo.startingIndex ?? 0;

for (const chapterData of data.childrenData) {
  const idx = data.childrenData.indexOf(chapterData);
  if (!chapterData.isActive) {
    const chapter = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.StackChapter,
    });
    const chapterDeltaDepth =
      (data.piece.masks.scaleY -
        chapter.tags.gapY * 2 -
        BibleVizDataRepository.getStackPieceMeasurement(
          "MinChapterBackDepth"
        )) *
      (chapterData.getPieceInfoProperty("amountOfVerses") / biggerChapter);

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
      label: idx + 1 + startingIndex,
    };

    chapter.OnSpawned({ mod: chapterMod });
    chapterData.setPiece(chapter);
    chapterData.attachToBible();
    chapterData.attachToBook();
    chapterData.activate();
    chapterData.show();
    if (BibleVizUtils.Data.masks.isInHistoryMode)
      setTagMask(
        chapter,
        "color",
        BibleVizUtils.Functions.GetHistoryColor({ piece: chapter })
      );
  }
}
data.piece.TrySetChaptersPosition({ setX: true, setY: true, setZ: true });
