import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { HighlightPacing } from "bibleStack.domain.models.pieces";
import type { PieceHighlightAdapterPort } from "bibleStack.application.ports.pieces";

export class PieceHighlightAdapter implements PieceHighlightAdapterPort {
  interruptSequence(_piece: Piece): void {}
  highlight(_piece: Piece, _pacing?: HighlightPacing): Promise<void> {
    return Promise.resolve();
  }
  rehighlight(_piece: Piece, _pacing?: HighlightPacing): Promise<void> {
    return Promise.resolve();
  }
  unhighlight(_piece: Piece, _pacing?: HighlightPacing): Promise<void> {
    return Promise.resolve();
  }
  increaseIntensity(_piece: Piece, _pacing?: HighlightPacing): void {}
  decreaseIntensity(_piece: Piece): void {}
}
