import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { SpatialNavigationServicePort } from "../ports/in/SpatialNavigation";
import type { BibleRecenterPort } from "../ports/out/BibleRecenter";
import type { BibleDataRepositoryPort } from "../ports/out/BibleDataRepository";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  bibleRecenterAdapterPort: BibleRecenterPort;
}

export class SpatialNavigationService implements SpatialNavigationServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #bibleRecenterAdapterPort: ServiceParams["bibleRecenterAdapterPort"];

  constructor({
    sequenceStateServicePort,
    bibleDataRepositoryPort,
    bibleRecenterAdapterPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#bibleRecenterAdapterPort = bibleRecenterAdapterPort;
  }

  async handleUserStoppedNavigation(): Promise<void> {
    const bible = this.#bibleDataRepositoryPort.getAllBiblesData()[0];

    if (this.#sequenceStateServicePort.isThereAnOngoingSequence() || !bible) {
      return;
    }

    // Query runs lock-free; only the recenter command takes a sequence lock.
    const isOffScreen =
      await this.#bibleRecenterAdapterPort.isBibleOffScreen(bible);

    if (isOffScreen) {
      this.#sequenceStateServicePort.executeAsSequence(() =>
        this.#bibleRecenterAdapterPort.recenter(bible)
      );
    }
  }
}
