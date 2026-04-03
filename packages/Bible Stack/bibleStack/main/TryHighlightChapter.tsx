import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
/**
 * Attempts to highlight a specific chapter within its parent data structure. It manages the highlighting state
 * to ensure that only one chapter can be highlighted at a time and handles any previous highlights accordingly.
 *
 * @param {Object} that - The object containing parameters for the operation.
 * @param {StackBookData|StackSectionBookData} that.parentData - The parent data object containing state information.
 * @param {StackChapterData} that.chapterData - The chapter data object to be highlighted.
 * @returns {boolean} - Returns false if the chapter cannot be highlighted, otherwise it highlights the chapter and returns nothing.
 *
 * @example
 * const success = thisBot.TryHighlightChapter({parentData: someData, chapterData: someChapterData});
 */

const {
  parentData,
  chapterData,
}: {
  parentData: StackBookData | StackSectionBookData;
  chapterData: StackChapterData;
} = that;

const previousHighlightedChapterData =
  parentData?.piece?.vars.previousHighlightedChapterData;

const piece = chapterData.piece;

if (
  !piece ||
  (previousHighlightedChapterData &&
    previousHighlightedChapterData == chapterData) ||
  piece?.masks.isBeingDragged ||
  // piece.masks.isSelecting                                    ||
  // piece.masks.isDeselecting                                  ||
  piece?.masks.isHighlighting ||
  (piece?.masks.isHighlighted && !piece?.masks.isUnhighlighting)
)
  return false;

// if( previousHighlightedChapterData                                                    &&
//     previousHighlightedChapterData.isActive                                           &&
//     !previousHighlightedChapterData.isHidden                                          &&
//     !previousHighlightedChapterData.piece.masks.isUnhighlighting         &&
//     previousHighlightedChapterData.piece.tags.isInUse                    &&
//     (previousHighlightedChapterData.piece.masks.isHighlighted || previousHighlightedChapterData.piece.masks.isHighlighting) &&
//     !previousHighlightedChapterData.piece.masks.isSelecting              &&
//     !previousHighlightedChapterData.isSelected)
// {
//     previousHighlightedChapterData.piece.Unhighlight({chapterData: previousHighlightedChapterData});
//     parentData.piece.vars.previousHighlightedChapterData = null;
// }

if (!chapterData.isSelected || !piece.masks.isOnTheGround) {
  tryHideNotification(piece);
}
piece.Highlight({ chapterData });
// if(parentData) parentData.piece.vars.previousHighlightedChapterData = chapterData;
