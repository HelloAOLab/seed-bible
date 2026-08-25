import type { Piece } from "../../../domain/models/canvas";

export interface VersesInteractionServicePort {
  handleVerseSelection(verse: Piece<"Verse">): void;
}
