import type { Piece } from "../../domain/models/canvas";
import type { PieceBot } from "../../infrastructure/models/casualos";

export interface PieceMapperPort {
  toDomain(verse: PieceBot<"Verse">): Piece<"Verse"> | undefined;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}
