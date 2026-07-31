import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  VersesBundleInteractionServicePort,
  SequenceStateServicePort,
  VersesBundleDataRepositoryPort,
  VersesBundleSelectionServicePort,
} from "bibleStack.application.ports.versesBundle";
import type { VersesBundleAdapterPort } from "bibleStack.application.ports.versesBundle";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  versesBundleDataRepositoryPort: VersesBundleDataRepositoryPort;
  versesBundleSelectionServicePort: VersesBundleSelectionServicePort;
  versesBundleAdapterPort: VersesBundleAdapterPort;
}

export class VersesBundleInteractionService implements VersesBundleInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #versesBundleDataRepositoryPort: ServiceParams["versesBundleDataRepositoryPort"];
  #versesBundleSelectionServicePort: ServiceParams["versesBundleSelectionServicePort"];
  #versesBundleAdapterPort: ServiceParams["versesBundleAdapterPort"];

  constructor({
    sequenceStateServicePort,
    versesBundleDataRepositoryPort,
    versesBundleSelectionServicePort,
    versesBundleAdapterPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#versesBundleDataRepositoryPort = versesBundleDataRepositoryPort;
    this.#versesBundleSelectionServicePort = versesBundleSelectionServicePort;
    this.#versesBundleAdapterPort = versesBundleAdapterPort;
  }

  handleBundleSelection(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      throw new Error(
        `VersesBundleInteractionService: bundleData not found at handleBundleSelection`
      );
    }

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      // TODO: Refactor the logic to piece highlight to its own service/adapter
      BibleVizUtils.Functions.HighlightBiblePiece({ piece: bundle });
    } else {
      if (!bundleData.isSelected) {
        this.#versesBundleSelectionServicePort.selectBundle(bundleData);
      }
    }
  }

  handleBundleFocusBegin(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      throw new Error(
        `VersesBundleInteractionService: bundleData not found at handleBundleFocusBegin`
      );
    }

    if (bundleData.isSelected || bundleData.isBeingDragged) return;

    this.#versesBundleAdapterPort.highlight(bundle);
  }

  handleBundleFocusEnd(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      throw new Error(
        `VersesBundleInteractionService: bundleData not found at handleBundleFocusBegin`
      );
    }

    if (bundleData.isSelected || bundleData.isBeingDragged) return;

    this.#versesBundleAdapterPort.unhighlight(bundle);
  }
}
