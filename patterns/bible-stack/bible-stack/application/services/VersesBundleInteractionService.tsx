import type { Piece } from "../../domain/models/canvas";
import type {
  VersesBundleInteractionServicePort,
  SequenceStateServicePort,
  VersesBundleDataRepositoryPort,
  VersesBundleSelectionServicePort,
} from "../ports/versesBundle";
import type { VersesBundleAdapterPort } from "../ports/versesBundle";
import type { PaintPort } from "../ports/in/Paint";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  versesBundleDataRepositoryPort: VersesBundleDataRepositoryPort;
  versesBundleSelectionServicePort: VersesBundleSelectionServicePort;
  versesBundleAdapterPort: VersesBundleAdapterPort;
  paintPort: PaintPort;
}

export class VersesBundleInteractionService implements VersesBundleInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #versesBundleDataRepositoryPort: ServiceParams["versesBundleDataRepositoryPort"];
  #versesBundleSelectionServicePort: ServiceParams["versesBundleSelectionServicePort"];
  #versesBundleAdapterPort: ServiceParams["versesBundleAdapterPort"];
  #paintPort: ServiceParams["paintPort"];

  constructor({
    sequenceStateServicePort,
    versesBundleDataRepositoryPort,
    versesBundleSelectionServicePort,
    versesBundleAdapterPort,
    paintPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#versesBundleDataRepositoryPort = versesBundleDataRepositoryPort;
    this.#versesBundleSelectionServicePort = versesBundleSelectionServicePort;
    this.#versesBundleAdapterPort = versesBundleAdapterPort;
    this.#paintPort = paintPort;
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

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(bundle);
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
