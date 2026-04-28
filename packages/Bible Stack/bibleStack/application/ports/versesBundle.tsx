import type { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

export interface VersesBundleInteractionServicePort {
  handleBundleSelection(bundle: Piece<"VersesBundle">): void;
  handleVersesBundleFocusBegin(bundle: Piece<"VersesBundle">): void;
  handleVersesBundleFocusEnd(bundle: Piece<"VersesBundle">): void;
}

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}

export interface VersesBundleDataRepositoryPort {
  getBundleData(piece: Piece<"VersesBundle">): VersesBundleData | undefined;
}
