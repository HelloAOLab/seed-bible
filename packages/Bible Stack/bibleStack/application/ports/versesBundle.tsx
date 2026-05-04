import type { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

export interface VersesBundleInteractionServicePort {
  handleBundleSelection(bundle: Piece<"VersesBundle">): void;
  handleBundleFocusBegin(bundle: Piece<"VersesBundle">): void;
  handleBundleFocusEnd(bundle: Piece<"VersesBundle">): void;
}

export interface SequenceStateServicePort {
  startSequence(): void;
  endSequence(): void;
  isThereAnOngoingSequence: () => boolean;
}

export interface VersesBundleDataRepositoryPort {
  getBundleData(piece: Piece<"VersesBundle">): VersesBundleData | undefined;
}

export interface VersesBundleSelectionServicePort {
  selectBundle(data: VersesBundleData): void;
  deselectBundle(data: VersesBundleData): void;
}

export interface VersesBundleAdapterPort {
  highlight(piece: Piece<"VersesBundle">): void;
  unhighlight(piece: Piece<"VersesBundle">): void;
}
