/**
 * Handles the completion of a Bible reset by highlighting sections in reverse order with a delay between highlights.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {Object} that.bibleData - The data of the Bible that has been reset.
 * @returns {Promise<void>} - This function returns a promise that resolves when the highlighting process is complete.
 * @example
 * shout("OnStackBibleResetComplete", {bibleData: someBibleData})
 */

import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackBibleData";
import { BiblePiece } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  bibleData,
}: {
  bibleData: StackBibleData;
} = that;
const sectionsToHighlight: Bot[] = [];

for (const testamentData of bibleData.childrenData) {
  testamentData.childrenData.forEach((sectionData) => {
    if (sectionData.piece) sectionsToHighlight.push(sectionData.piece);
  });
}
sectionsToHighlight.reverse();
await os.sleep(500);
for (const section of sectionsToHighlight) {
  thisBot.TryHighlightPiece({
    piece: section,
    highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Transition,
    unhighlightDelay: 2000,
    typeOfPiece: BiblePiece.StackSection,
  });
  await os.sleep(100);
}
setTagMask(thisBot, "isBibleAnimating", false);
