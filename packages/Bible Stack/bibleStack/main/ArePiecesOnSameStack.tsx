/**
 * Determine if a list of pieces belongs to the same Bible stack.
 * @param {Object} that - Object that contains important data for the function
 * @param {Array} that.pieces - List of pieces to be compared
 * @example
 * const arePiecesOnSameBible = thisBot.ArePiecesOnSameStack({pieces: [pieceOne, pieceTwo]})
 */

import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  pieces,
}: {
  pieces: Bot[];
} = that;

const piecesData = await Promise.all(
  pieces.map((piece) => {
    return thisBot.GetPieceData({ piece }) as Promise<
      | StackTestamentData
      | StackSectionData
      | StackSectionBookData
      | StackBookData
      | StackChapterData
    >;
  })
);

const firstData = piecesData[0];

if (!firstData) {
  throw new Error("ArePiecesOnSameStack: firstData not found.");
}

return piecesData.every((pieceData) => {
  return (
    pieceData.getParentId("stackBibleId") ===
    firstData.getParentId("stackBibleId")
  );
});
