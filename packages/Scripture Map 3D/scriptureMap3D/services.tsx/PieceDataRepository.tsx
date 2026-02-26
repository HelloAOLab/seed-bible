import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  BiblePieceType,
  type BiblePieceTypeType,
} from "bibleVizUtils.models.enums";
import { getSelf as getBibleScriptureMap3DMain } from "scriptureMap3D.main.selfGetter";

const scriptureMap3DMain = getBibleScriptureMap3DMain();

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): any {
    let data;

    switch (piece.tags.typeOfPiece as BiblePieceTypeType) {
      case BiblePieceType.LayoutBook:
        data = scriptureMap3DMain.vars.layoutBooksData.find((data) => {
          return data.isActive && data.piece?.id === piece.id;
        });
        break;
      case BiblePieceType.LayoutChapter:
        data = scriptureMap3DMain.vars.layoutChaptersData.find((data) => {
          return data.isActive && data.piece.id === piece.id;
        });
        break;
      default:
        break;
    }

    return data;
  }
}
