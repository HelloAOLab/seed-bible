import type { BibleSequenceServicePort } from "../../../application/ports/in/BibleSequence";
import type { BibleDataRepository } from "../../adapters/stacks/BibleDataRepository";
import type { CoverBot } from "../../models/stack";

interface ControllerParams {
  bibleSequenceServicePort: BibleSequenceServicePort;
  bibleDataRepositoryPort: BibleDataRepository;
}

export class CoverInteractionController {
  #bibleSequenceServicePort: ControllerParams["bibleSequenceServicePort"];
  #bibleDataRepositoryPort: ControllerParams["bibleDataRepositoryPort"];

  constructor({
    bibleSequenceServicePort,
    bibleDataRepositoryPort,
  }: ControllerParams) {
    this.#bibleSequenceServicePort = bibleSequenceServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
  }

  handleCoverClick(cover: CoverBot) {
    const bibleId = cover.tags.stackBibleId;
    const bibleData = this.#bibleDataRepositoryPort.getBibleDataById(bibleId);
    if (!bibleData) {
      throw new Error(
        "CoverInteractionController: bibleData not found at handleCoverClick"
      );
    }
    this.#bibleSequenceServicePort.resetBible({
      bibleData,
      pacing: "Regular",
    });
  }
}
