import type { VersesBundleData } from "../../domain/entities/VersesBundleData";
import type { Piece } from "../../domain/models/canvas";

export interface SequenceStateServicePort {
  startSequence(): void;
  endSequence(): void;
  isThereAnOngoingSequence: () => boolean;
}

export interface VersesBundleDataRepositoryPort {
  getBundleData(piece: Piece<"VersesBundle">): VersesBundleData | undefined;
}

export interface VersesBundleAdapterPort {
  highlight(piece: Piece<"VersesBundle">): void;
  unhighlight(piece: Piece<"VersesBundle">): void;
}
