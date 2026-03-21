import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { BiblePiece, type BiblePieceType } from "bibleVizUtils.models.canvas";
import { getSelf as getBibleStackMain } from "bibleStack.main.selfGetter";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

const bibleStackMain = getBibleStackMain();

// TODO: Move the storage of pieces data from bibleStackMain to this repository
// TODO: Define data entities
// TODO: Define return type

type AnyStackData =
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData;

const dataStrategy: Record<string, AnyStackData[]> = {
  [BiblePiece.StackTestament]: (bibleStackMain.vars.stackTestamentsData ??
    []) as StackTestamentData[],
  [BiblePiece.StackSection]: (bibleStackMain.vars.stackSectionsData ??
    []) as StackSectionData[],
  [BiblePiece.StackSectionBook]: (bibleStackMain.vars.stackSectionBooksData ??
    []) as StackSectionBookData[],
  [BiblePiece.StackBook]: (bibleStackMain.vars.stackBooksData ??
    []) as StackBookData[],
  [BiblePiece.StackChapter]: (bibleStackMain.vars.stackChaptersData ??
    []) as StackChapterData[],
};

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): AnyStackData | undefined {
    const targetArray = dataStrategy[piece.tags.typeOfPiece];

    if (!targetArray) {
      console.warn(
        `PieceDataRepository.getPieceData: No data array found for piece type '${piece.tags.typeOfPiece}'`
      );
      return undefined;
    }

    return targetArray.find((data) => {
      return data.isActive && !!data.piece && data.piece.id === piece.id;
    });
  }
}
