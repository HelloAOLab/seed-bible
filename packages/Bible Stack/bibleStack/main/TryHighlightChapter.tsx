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

const {parentData, chapterData} = that;

const previousHighlightedChapterData = parentData?.piece.vars.previousHighlightedChapterData;

if((previousHighlightedChapterData && previousHighlightedChapterData == chapterData)    || 
    chapterData.piece.masks.isBeingDragged                                 ||
    // chapterData.piece.masks.isSelecting                                    || 
    // chapterData.piece.masks.isDeselecting                                  ||
    chapterData.piece.masks.isHighlighting                                 || 
    (chapterData.piece.masks.isHighlighted && !chapterData.piece.masks.isUnhighlighting)) return false;

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
if(!chapterData.isSelected || !chapterData.piece.masks.isOnTheGround) 
{
    BibleVizUtils.Functions.TryHideActivityNotificationOnPiece({piece: chapterData.piece})
}
chapterData.piece.Highlight({chapterData});
// if(parentData) parentData.piece.vars.previousHighlightedChapterData = chapterData;