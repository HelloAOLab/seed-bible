/**
 * Takes a bible piece and returns the data associated with it
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The piece which its data is requested
 * @example
 * const data = thisBot.GetPieceData({piece: section});
 */

import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { BiblePiece } from "bibleVizUtils.models.canvas";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

const { piece } = that;

type AnyStackData =
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData;

const dataStrategy: Record<string, AnyStackData[]> = {
  [BiblePiece.StackTestament]: (thisBot.vars.stackTestamentsData ??
    []) as StackTestamentData[],
  [BiblePiece.StackSection]: (thisBot.vars.stackSectionsData ??
    []) as StackSectionData[],
  [BiblePiece.StackSectionBook]: (thisBot.vars.stackSectionBooksData ??
    []) as StackSectionBookData[],
  [BiblePiece.StackBook]: (thisBot.vars.stackBooksData ??
    []) as StackBookData[],
  [BiblePiece.StackChapter]: (thisBot.vars.stackChaptersData ??
    []) as StackChapterData[],
};

const targetArray = dataStrategy[piece.tags.typeOfPiece];

if (!targetArray) {
  console.warn(
    `GetPieceData: No data array found for piece type '${piece.tags.typeOfPiece}'`
  );
  return undefined;
}

return targetArray.find((data) => {
  return data.isActive && !!data.piece && data.piece.id === piece.id;
});
