import type { StackBibleData } from "../../domain/entities/StackBibleData";
import { BibleStates } from "../../domain/models/canvas";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { BibleModeSequenceAdapterPort } from "../ports/out/BibleMode";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  sequenceAdapterPort: BibleModeSequenceAdapterPort;
}

export class BibleModeService {
  #isTryingToToggle: boolean = false;
  #isStopping: boolean = false;
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #sequenceAdapterPort: ServiceParams["sequenceAdapterPort"];

  constructor({
    sequenceStateServicePort,
    sequenceAdapterPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#sequenceAdapterPort = sequenceAdapterPort;
  }

  async tryToggleMode(bibleData: StackBibleData) {
    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#isTryingToToggle ||
      this.#isStopping ||
      bibleData.currentState !== BibleStates.Open
    )
      return;

    this.#isTryingToToggle = true;
    // TODO: Emit an event that will liste the interaction registry to register this bible as the last interacted.
    const finished =
      await this.#sequenceAdapterPort.showToggleAttemptFeedback();
    if (finished) {
      this.#isTryingToToggle = false;
      this.#toggleMode(bibleData);
    }
  }

  tryStopToggle() {}

  #toggleMode(bibleData: StackBibleData) {}
}
