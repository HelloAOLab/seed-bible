import type { CrossLineBot } from "../../models/stack";
import type { BibleModeServicePort } from "../../../application/ports/in/BibleMode";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import type { BibleDataRepository } from "../../adapters/stacks/BibleDataRepository";

interface ControllerParams {
  crossLineMapperPort: StackCrossLineMapper;
  bibleModeServicePort: BibleModeServicePort;
  bibleDataRepositoryPort: BibleDataRepository;
}

export class CrossLineInteractionController {
  #crossLineMapperPort: ControllerParams["crossLineMapperPort"];
  #bibleModeServicePort: ControllerParams["bibleModeServicePort"];
  #bibleDataRepositoryPort: ControllerParams["bibleDataRepositoryPort"];

  constructor({
    crossLineMapperPort,
    bibleModeServicePort,
    bibleDataRepositoryPort,
  }: ControllerParams) {
    this.#crossLineMapperPort = crossLineMapperPort;
    this.#bibleModeServicePort = bibleModeServicePort;
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
  }

  handleCrossLinePointerDown(crossLine: CrossLineBot) {
    const crossLineBot = this.#crossLineMapperPort.toDomain(crossLine);
    const bibleData = this.#bibleDataRepositoryPort.getBibleDataById(
      crossLineBot.bibleId
    );
    if (!bibleData) {
      throw new Error(
        "CrossLineInteractionController: bibleData not found at handleCrossLinePointerDown"
      );
    }
    this.#bibleModeServicePort.tryToggleMode(bibleData);
  }

  handleCrossLinePointerUp(crossLine: CrossLineBot) {
    const crossLineBot = this.#crossLineMapperPort.toDomain(crossLine);
    const bibleData = this.#bibleDataRepositoryPort.getBibleDataById(
      crossLineBot.bibleId
    );
    if (!bibleData) {
      throw new Error(
        "CrossLineInteractionController: bibleData not found at handleCrossLinePointerUp"
      );
    }
    this.#bibleModeServicePort.tryStopToggle(bibleData);
  }
}
