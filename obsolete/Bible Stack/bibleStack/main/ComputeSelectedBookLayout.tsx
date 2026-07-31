import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

const {
  data,
}: {
  data: StackSectionBookData | StackBookData;
} = that;

if (data.isSelected && data.piece) {
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
