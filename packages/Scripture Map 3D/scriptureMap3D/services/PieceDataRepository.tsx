import type { LayoutBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/LayoutBookData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { BiblePiece } from "bibleVizUtils.models.canvas";
import { getSelf as getBibleScriptureMap3DMain } from "scriptureMap3D.main.selfGetter";
import type { LayoutChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/LayoutChapterData";

const scriptureMap3DMain = getBibleScriptureMap3DMain();

type AnyLayoutData = LayoutBookData | LayoutChapterData;

const dataStrategy: Record<string, AnyLayoutData[]> = {
  [BiblePiece.LayoutBook]: (scriptureMap3DMain.vars.layoutBooksData ??
    []) as LayoutBookData[],
  [BiblePiece.LayoutChapter]: (scriptureMap3DMain.vars.layoutChaptersData ??
    []) as LayoutChapterData[],
};

export class PieceDataRepository {
  static getPieceData({ piece }: { piece: Bot }): AnyLayoutData | undefined {
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
