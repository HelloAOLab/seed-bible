import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { VersesBundleAdapterPort } from "bibleStack.application.ports.versesBundle";

export class VersesBundleAdapter implements VersesBundleAdapterPort {
  highlight(piece: Piece<"VersesBundle">) {}
  unhighlight(piece: Piece<"VersesBundle">) {}
}
