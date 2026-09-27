import type { Piece } from "../../../domain/models/canvas";

export interface VersesBundlePort {
  highlight(piece: Piece<"VersesBundle">): void;
  unhighlight(piece: Piece<"VersesBundle">): void;
}
