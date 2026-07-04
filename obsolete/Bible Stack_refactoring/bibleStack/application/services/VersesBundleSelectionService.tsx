import type { VersesBundleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/VersesBunbleData";
import type {
  SequenceStateServicePort,
  VersesBundleSelectionServicePort,
} from "bibleStack.application.ports.versesBundle";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
}

export class VersesBundleSelectionService implements VersesBundleSelectionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];

  constructor({ sequenceStateServicePort }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
  }

  selectBundle(data: VersesBundleData): void {
    data.select();
    this.#sequenceStateServicePort.startSequence();
    // await chunkOfVerses.Select(); // Probably call VersesBundleAdapter.select()?
    this.#sequenceStateServicePort.endSequence();
  }

  deselectBundle(data: VersesBundleData): void {
    data.deselect();
  }
}
