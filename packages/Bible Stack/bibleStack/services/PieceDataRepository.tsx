import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  BiblePiece,
  type BiblePieceType,
} from "bibleVizUtils.models. canvas.models";
import { getSelf as getBibleStackMain } from "bibleStack.main.selfGetter";

const bibleStackMain = getBibleStackMain();

// TODO: Move the storage of pieces data from bibleStackMain to this repository
// TODO: Define data entities
// TODO: Define return type

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): any {
    let data;

    switch (piece.tags.typeOfPiece as BiblePieceType) {
      case BiblePiece.StackTestament:
        data = bibleStackMain.vars.stackTestamentsData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePiece.StackSection:
        data = bibleStackMain.vars.stackSectionsData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePiece.StackSectionBook:
        data = bibleStackMain.vars.stackSectionBooksData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePiece.StackBook:
        data = bibleStackMain.vars.stackBooksData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      case BiblePiece.StackChapter:
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
