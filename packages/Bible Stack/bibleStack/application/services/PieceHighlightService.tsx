import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { PieceHighlightServicePort } from "bibleStack.application.ports.pieces";
import type { HighlightRequestSource } from "../../domain/models/pieces";

export class PieceHighlightService implements PieceHighlightServicePort {
  tryHighlightPiece: (params: {
    piece: Piece;
    source: HighlightRequestSource;
  }) => void = ({ piece, source }) => {};
}
