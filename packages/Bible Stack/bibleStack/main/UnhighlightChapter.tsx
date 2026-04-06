/**
 * Unhighlights a previously highlighted chapter in the parent data's chapter list.
 * This function checks if there is a previously highlighted chapter that is active
 * and not in the process of being unhighlighted. If so, it unhighlights it and resets
 * the reference in the parent data.
 *
 * @param {Object} that - The object containing parent and chapter data.
 * @param {StackBookData|StackSectionBookData} that.parentData - The data containing the chapter in its structure.
 * @param {StackChapterData} that.chapterData - The data associated to the chapter being unhighlighted.
 *
 * @example
 * thisBot.UnhighlightChapter({ parentData: someData, chapterData: someChapterData });
 */

import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

const {
  parentData,
}: {
  parentData: StackBookData | StackSectionBookData;
} = that;

const previousHighlightedChapterData =
  parentData.piece?.vars.previousHighlightedChapterData;

if (
  previousHighlightedChapterData &&
  previousHighlightedChapterData.isActive &&
  !previousHighlightedChapterData.chapterTransformer.masks.isUnhighlighting &&
  previousHighlightedChapterData.chapterTransformer.tags.isInUse &&
  (previousHighlightedChapterData.chapterTransformer.masks.isHighlighted ||
    previousHighlightedChapterData.chapterTransformer.masks.isHighlighting) &&
  !previousHighlightedChapterData.chapterTransformer.masks.isSelecting &&
  !previousHighlightedChapterData.chapterTransformer.masks.isSelected
) {
  previousHighlightedChapterData.chapterTransformer.Unhighlight({
    chapterData: previousHighlightedChapterData,
  });
  parentData.piece.vars.previousHighlightedChapterData = null;
}
