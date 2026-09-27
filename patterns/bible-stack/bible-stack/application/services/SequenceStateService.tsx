import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { LoggerPort } from "../ports/out/Logger";
import type { SequenceEventPort } from "../ports/sequence";

interface ServiceParams {
  sequenceEventPort: SequenceEventPort;
  loggerPort: LoggerPort;
}

export class SequenceStateService implements SequenceStateServicePort {
  #isThereAnOngoingSequence: boolean = false;
  #sequenceEventPort: ServiceParams["sequenceEventPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({ sequenceEventPort, loggerPort }: ServiceParams) {
    this.#sequenceEventPort = sequenceEventPort;
    this.#loggerPort = loggerPort;
  }

  startSequence() {
    if (this.#isThereAnOngoingSequence) return;

    this.#isThereAnOngoingSequence = true;
    this.#sequenceEventPort.emit("OnStackSequenceStart");
  }
  endSequence() {
    if (!this.#isThereAnOngoingSequence) return;

    this.#isThereAnOngoingSequence = false;
    this.#sequenceEventPort.emit("OnStackSequenceEnd");
  }
  isThereAnOngoingSequence() {
    return this.#isThereAnOngoingSequence;
  }

  async executeAsSequence(task: () => Promise<void>): Promise<void> {
    if (this.isThereAnOngoingSequence()) return;

    this.startSequence();
    try {
      await task();
    } catch (error) {
      this.#loggerPort.error(
        "SequenceStateService: Error while executing the task",
        { error }
      );
    } finally {
      this.endSequence();
    }
  }
}
