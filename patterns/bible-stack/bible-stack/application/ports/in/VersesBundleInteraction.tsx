import type { Piece } from "../../../domain/models/canvas";

export interface VersesBundleInteractionServicePort {
  handleBundleSelection(bundle: Piece<"VersesBundle">): void;
  handleBundleFocusBegin(bundle: Piece<"VersesBundle">): void;
  handleBundleFocusEnd(bundle: Piece<"VersesBundle">): void;
}
