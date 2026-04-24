import type { SequenceEventPort } from "bibleStack.application.ports.sequence";

interface ServiceParams {
  sequenceEventPort: SequenceEventPort;
}

export class SequenceStateService {
  #isThereAnOngoingSequence: boolean = false;
  #sequenceEventPort: ServiceParams["sequenceEventPort"];

  constructor({ sequenceEventPort }: ServiceParams) {
    this.#sequenceEventPort = sequenceEventPort;
  }

  startSequence() {
    if (!this.#isThereAnOngoingSequence) {
      this.#isThereAnOngoingSequence = true;
      this.#sequenceEventPort.emit("OnStackSequenceStart");
    }
  }
  endSequence() {
    if (this.#isThereAnOngoingSequence) {
      this.#isThereAnOngoingSequence = false;
      this.#sequenceEventPort.emit("OnStackSequenceEnd");
    }
  }
  isThereAnOngoingSequence() {
    return this.#isThereAnOngoingSequence;
  }
}
