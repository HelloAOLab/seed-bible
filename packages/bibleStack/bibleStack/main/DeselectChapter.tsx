/**
 * Deselects a chapter piece and updates tag masks for animation and deselection states.
 * 
 * @param {Object} that - Context containing the chapter data and optional flags.
 * @param {StackChapterData} that.chapterData - Data object representing the chapter to deselect.
 * @param {boolean} that.setBibleAnimating? - Is optional and is a flag indicating whether to set the Bible animating state.
 * 
 * @returns {Promise<void>} - Resolves when the deselection is complete.
 * @throws {Error} - If deselection fails.
 * 
 * @example
 * thisBot.DeselectChapter({chapterData: someChapterData, setBibleAnimating: true});
 */

const {chapterData, setBibleAnimating = false} = that;

if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);
chapterData.isSelected = false;
BibleVizUtils.Functions.TryHideUsersColorOnPiece({piece: chapterData.piece});
setTagMask(thisBot, "aChapterIsBeingDeselected", true);
await chapterData.piece.Deselect({chapterData});
setTagMask(thisBot, "aChapterIsBeingDeselected", false);
if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({piecesData: [chapterData], manager: thisBot})