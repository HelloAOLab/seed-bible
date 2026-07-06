/**
 * Handles the completion of the initial Bible open animation by highlighting each testament piece.
 * The function waits for a short delay before starting to highlight each piece in sequence.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {Object} that.bibleData - The data of the Bible whose testaments will be highlighted.
 * @returns {Promise<void>} - This function returns a promise that resolves when all highlights are complete.
 * @example
 * shout("OnInitialBibleOpenAnimationCompleted", {bibleData: someBibleData})
 */

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { BibleType } from "bibleVizUtils.models.canvas";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

const {
  bibleData,
}: {
  bibleData: StackBibleData;
} = that;

if (bibleData.bibleType !== BibleType.Default) return;

await os.sleep(500);
for (const testamentData of bibleData.childrenData) {
  thisBot.TryHighlightPiece({
    piece: testamentData.piece,
    highlightRequestSource: CanvasInteractions.Transition,
    unhighlightDelay: 4000,
  });
  await os.sleep(100);
}
// await os.sleep(60);
