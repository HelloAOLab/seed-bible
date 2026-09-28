import type { StackCover } from "../../domain/models/pieces";
import { StackPresenceNavigationPacings } from "../../domain/models/userPresence";
import type { BibleSequenceServicePort } from "../ports/in/BibleSequence";
import type { CoverInteractionServicePort } from "../ports/in/CoverInteraction";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { BibleDataRepositoryPort } from "../ports/stacks";

interface ServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
}

export class CoverInteractionService implements CoverInteractionServicePort {
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #bibleSequenceServicePort: ServiceParams["bibleSequenceServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];

  constructor({
    bibleDataRepositoryPort,
    bibleSequenceServicePort,
    sequenceStateServicePort,
  }: ServiceParams) {
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#bibleSequenceServicePort = bibleSequenceServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
  }

  handleCoverClick(cover: StackCover) {
    const bibleData = this.#bibleDataRepositoryPort.getBibleDataById(
      cover.bibleId
    );
    if (!bibleData) {
      throw new Error(
        "CoverInteractionService: bibleData not found at handleCoverClick"
      );
    }
    this.#sequenceStateServicePort.executeAsSequence(() =>
      this.#bibleSequenceServicePort.resetBible({
        bibleData,
        pacing: StackPresenceNavigationPacings.Double,
      })
    );
  }
}
