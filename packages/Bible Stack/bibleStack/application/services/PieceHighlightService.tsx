import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { PieceHighlightServicePort } from "bibleStack.application.ports.pieces";
import type {
  HighlightRequestSource,
  UnhighlightPacing,
  UnhighlightRequestSource,
} from "../../domain/models/pieces";
import type { LabelTranslucencyMode } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/label";

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
    dealy?: number;
  }) => Promise<void> = ({ piece, source, pacing, dealy }) => {
    return Promise.resolve();
  };

  isUnhighlightScheduled: (piece: Piece) => boolean = (piece) => {
    return true;
  };

  changeHighlightIntensity: ({
    piece,
    intensity,
  }: {
    piece: Piece;
    intensity: LabelTranslucencyMode;
  }) => void = () => {};
}
