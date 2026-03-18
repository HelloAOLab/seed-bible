import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { BiblePiece, type BiblePieceType } from "bibleVizUtils.models.canvas";
import { getSelf as getBibleScriptureMap3DMain } from "scriptureMap3D.main.selfGetter";

const scriptureMap3DMain = getBibleScriptureMap3DMain();

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): any {
    let data;

    switch (piece.tags.typeOfPiece as BiblePieceType) {
      case BiblePiece.LayoutBook:
        data = scriptureMap3DMain.vars.layoutBooksData.find((data) => {
          return data.isActive && data.piece?.id === piece.id;
        });
        break;
      case BiblePiece.LayoutChapter:
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
