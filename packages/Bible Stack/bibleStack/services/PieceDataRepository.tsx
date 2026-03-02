import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  BiblePieceType,
  type BiblePieceTypeType,
} from "bibleVizUtils.models.enums";
import { getSelf as getBibleStackMain } from "bibleStack.main.selfGetter";

const bibleStackMain = getBibleStackMain();

// TODO: Move the storage of pieces data from bibleStackMain to this repository
// TODO: Define data entities
// TODO: Define return type

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): any {
    let data;

    switch (piece.tags.typeOfPiece as BiblePieceTypeType) {
      case BiblePieceType.StackTestament:
        data = bibleStackMain.vars.stackTestamentsData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePieceType.StackSection:
        data = bibleStackMain.vars.stackSectionsData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePieceType.StackSectionBook:
        data = bibleStackMain.vars.stackSectionBooksData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePieceType.StackBook:
        data = bibleStackMain.vars.stackBooksData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePieceType.StackChapter:
        data = bibleStackMain.vars.stackChaptersData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      default:
        break;
    }

    return data;
  }
}
