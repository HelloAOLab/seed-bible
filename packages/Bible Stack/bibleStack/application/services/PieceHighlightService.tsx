import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { PieceHighlightServicePort } from "bibleStack.application.ports.pieces";
import type {
  HighlightRequestSource,
  UnhighlightPacing,
  UnhighlightRequestSource,
} from "../../domain/models/pieces";

export class PieceHighlightService implements PieceHighlightServicePort {
  tryHighlightPiece: (params: {
    piece: Piece;
    source: HighlightRequestSource;
  }) => Promise<void> = ({ piece, source }) => {
    return Promise.resolve();
  };

  tryUnhighlightPiece: (params: {
    piece: Piece;
    source: UnhighlightRequestSource;
    pacing: UnhighlightPacing;
  }) => Promise<void> = ({ piece, source, pacing }) => {
    return Promise.resolve();
  };
}
