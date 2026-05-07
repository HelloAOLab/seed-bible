import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { HighlightPacing } from "bibleStack.domain.models.pieces";
import type { PieceHighlightAdapterPort } from "bibleStack.application.ports.pieces";

export class PieceHighlightAdapter implements PieceHighlightAdapterPort {
  interruptSequence(piece: Piece): void {}
  highlight(piece: Piece, pacing?: HighlightPacing): Promise<void> {
    return Promise.resolve();
  }
  rehighlight(piece: Piece, pacing?: HighlightPacing): Promise<void> {
    return Promise.resolve();
  }
}
