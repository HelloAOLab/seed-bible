import type { Piece } from "../../domain/models/canvas";
import type { VersesBundleDataRepositoryPort } from "../ports/versesBundle";
import type { VersesBundleAdapterPort } from "../ports/versesBundle";
import type { VersesBundleInteractionServicePort } from "../ports/in/VersesBundleInteraction";
import type { VersesBundleSelectionServicePort } from "../ports/in/VersesBundleSelection";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { LoggerPort } from "../ports/out/Logger";
import type { PaintServicePort } from "../ports/in/Paint";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  versesBundleDataRepositoryPort: VersesBundleDataRepositoryPort;
  versesBundleSelectionServicePort: VersesBundleSelectionServicePort;
  versesBundleAdapterPort: VersesBundleAdapterPort;
  paintPort: PaintServicePort;
  loggerPort: LoggerPort;
}

export class VersesBundleInteractionService implements VersesBundleInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #versesBundleDataRepositoryPort: ServiceParams["versesBundleDataRepositoryPort"];
  #versesBundleSelectionServicePort: ServiceParams["versesBundleSelectionServicePort"];
  #versesBundleAdapterPort: ServiceParams["versesBundleAdapterPort"];
  #paintPort: ServiceParams["paintPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    sequenceStateServicePort,
    versesBundleDataRepositoryPort,
    versesBundleSelectionServicePort,
    versesBundleAdapterPort,
    paintPort,
    loggerPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#versesBundleDataRepositoryPort = versesBundleDataRepositoryPort;
    this.#versesBundleSelectionServicePort = versesBundleSelectionServicePort;
    this.#versesBundleAdapterPort = versesBundleAdapterPort;
    this.#paintPort = paintPort;
    this.#loggerPort = loggerPort;
  }

  handleBundleSelection(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      this.#loggerPort.error(
        "VersesBundleInteractionService: bundleData not found at handleBundleSelection"
      );
      return;
    }

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(bundle);
    } else {
      if (!bundleData.isSelected) {
        this.#sequenceStateServicePort.executeAsSequence(() =>
          this.#versesBundleSelectionServicePort.selectBundle(bundleData)
        );
      }
    }
  }

  handleBundleFocusBegin(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      this.#loggerPort.error(
        "VersesBundleInteractionService: bundleData not found at handleBundleFocusBegin"
      );
      return;
    }

    if (bundleData.isSelected || bundleData.isBeingDragged) return;

    this.#versesBundleAdapterPort.highlight(bundle);
  }

  handleBundleFocusEnd(bundle: Piece<"VersesBundle">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bundleData =
      this.#versesBundleDataRepositoryPort.getBundleData(bundle);

    if (!bundleData) {
      this.#loggerPort.error(
        "VersesBundleInteractionService: bundleData not found at handleBundleFocusEnd"
      );
      return;
    }

    if (bundleData.isSelected || bundleData.isBeingDragged) return;

    this.#versesBundleAdapterPort.unhighlight(bundle);
  }
}
