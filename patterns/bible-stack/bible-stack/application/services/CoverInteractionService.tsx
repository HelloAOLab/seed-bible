import type { StackCover } from "../../domain/models/pieces";
import { StackPresenceNavigationPacings } from "../../domain/models/userPresence";
import type { BibleSequenceServicePort } from "../ports/in/BibleSequence";
import type { CoverInteractionServicePort } from "../ports/in/CoverInteraction";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { LoggerPort } from "../ports/out/Logger";
import type { BibleDataRepositoryPort } from "../ports/stacks";

interface ServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  bibleSequenceServicePort: BibleSequenceServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
  loggerPort: LoggerPort;
}

export class CoverInteractionService implements CoverInteractionServicePort {
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #bibleSequenceServicePort: ServiceParams["bibleSequenceServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    bibleDataRepositoryPort,
    bibleSequenceServicePort,
    sequenceStateServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#bibleSequenceServicePort = bibleSequenceServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#loggerPort = loggerPort;
  }

  handleCoverClick(cover: StackCover) {
    const bibleData = this.#bibleDataRepositoryPort.getBibleDataById(
      cover.bibleId
    );
    if (!bibleData) {
      this.#loggerPort.error(
        "CoverInteractionService: bibleData not found at handleCoverClick"
      );
      return;
    }
    this.#sequenceStateServicePort.executeAsSequence(() =>
      this.#bibleSequenceServicePort.resetBible({
        bibleData,
        pacing: StackPresenceNavigationPacings.Double,
      })
    );
  }
}
