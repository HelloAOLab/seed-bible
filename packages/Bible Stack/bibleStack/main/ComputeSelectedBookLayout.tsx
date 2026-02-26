import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const { data } = that;

if (data.isSelected) {
  const isSectionBookDataInstance =
    data instanceof StackSectionBookData ||
    data.constructor.name === "StackSectionBookData";
  const chapterColumns = Math.floor(
    (isSectionBookDataInstance
      ? data.piece.tags.initialScaleX
      : data.piece.tags.singleBooksScales.x) /
      (BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth") +
        BibleVizDataRepository.getStackSpacing("ChapterGap") * 2)
  );
  const chapterRows =
    Math.ceil(data.piece.tags.numberOfChapters / chapterColumns) + 1;
  const selectedBookHeight =
    chapterRows *
    (BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight") +
      BibleVizDataRepository.getStackSpacing("ChapterGap") * 2);
  return { chapterColumns, chapterRows, selectedBookHeight };
} else {
  return {};
}
