import type { VersesBundleData } from "../../domain/entities/VersesBundleData";
import type { SequenceStateServicePort } from "../ports/versesBundle";
import type { VersesBundleSelectionServicePort } from "../ports/in/VersesBundleSelection";

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
    // TODO: await chunkOfVerses.Select(); // Probably call VersesBundleAdapter.select()?
    this.#sequenceStateServicePort.endSequence();
  }

  deselectBundle(data: VersesBundleData): void {
    data.deselect();
    // TODO: perform deselect sequence on an adapter
  }
}
