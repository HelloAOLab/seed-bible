import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";

export interface VersesInteractionServicePort {
  handleVerseSelection(verse: Piece<"Verse">): void;
}

export interface PieceMapperPort {
  toDomain(verse: PieceBot<"Verse">): Piece<"Verse"> | undefined;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}
