import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { SequenceEventPort } from "../ports/sequence";

interface ServiceParams {
  sequenceEventPort: SequenceEventPort;
}

export class SequenceStateService implements SequenceStateServicePort {
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

  async executeAsSequence(task: () => Promise<void>): Promise<void> {
    if (this.isThereAnOngoingSequence()) return;

    this.startSequence();
    try {
      await task();
    } finally {
      this.endSequence();
    }
  }
}
