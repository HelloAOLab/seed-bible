import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceAdapterPort as BooksPieceAdapterPort } from "bibleStack.application.ports.books";
import { PieceMapper } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/mappers/PieceMapper";
import type { PieceAdapterPort as DragPieceAdapterPort } from "bibleStack.application.ports.scripturePieceDrag";
import type { PieceAdapterPort as StructurePieceAdapterPort } from "bibleStack.application.ports.stackStructure";

export class PieceAdapter
  implements
    BooksPieceAdapterPort,
    DragPieceAdapterPort,
    StructurePieceAdapterPort
{
  isPieceAnchored: (piece: Piece) => boolean = (piece) => {
    const pieceBot = PieceMapper.toInfrastructure(piece);
    return !!pieceBot?.tags.draggable;
  };
  makePieceErasable: (piece: Piece) => void = (piece) => {
    const pieceBot = PieceMapper.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`PieceAdapter: pieceBot not found at makePieceErasable`);
    }
    pieceBot.tags.toErase = true;
  };
}
