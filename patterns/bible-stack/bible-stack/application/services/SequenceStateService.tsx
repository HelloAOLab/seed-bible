import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { LoggerPort } from "../ports/out/Logger";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";

interface ServiceParams {
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  loggerPort: LoggerPort;
}

export class SequenceStateService implements SequenceStateServicePort {
  #isThereAnOngoingSequence: boolean = false;
  #eventManagerPort: ServiceParams["eventManagerPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({ eventManagerPort, loggerPort }: ServiceParams) {
    this.#eventManagerPort = eventManagerPort;
    this.#loggerPort = loggerPort;
  }

  startSequence() {
    if (this.#isThereAnOngoingSequence) return;

    this.#isThereAnOngoingSequence = true;
    this.#eventManagerPort.emit("OnStackSequenceStart");
  }
  endSequence() {
    if (!this.#isThereAnOngoingSequence) return;

    this.#isThereAnOngoingSequence = false;
    this.#eventManagerPort.emit("OnStackSequenceEnd");
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
