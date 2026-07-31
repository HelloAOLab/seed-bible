import type { SequenceStateServicePort as VersesBundleSequenceStateServicePort } from "bibleStack.application.ports.versesBundle";
import type { SequenceEventPort } from "bibleStack.application.ports.sequence";

interface ServiceParams {
  sequenceEventPort: SequenceEventPort;
}

export class SequenceStateService implements VersesBundleSequenceStateServicePort {
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
