import type { PieceBot } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/casualos";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { pieceDataRepository } from "bibleStack.services.index";

export function ArePiecesOnSameStack(pieces: PieceBot[]): boolean {
  const piecesData = pieces.map((piece) => {
    return pieceDataRepository.getPieceData({
      getTypeOfPiece: () => piece.tags.typeOfPiece,
      getId: () => piece.id,
    });
  });

  const firstData = piecesData[0];

  if (!firstData) {
    throw new Error("ArePiecesOnSameStack: firstData not found.");
  }

  return piecesData.every((pieceData) => {
    return (
      pieceData?.getParentId("stackBibleId") ===
      firstData.getParentId("stackBibleId")
    );
  });
}
