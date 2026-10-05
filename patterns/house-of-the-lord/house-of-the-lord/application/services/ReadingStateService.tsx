import type { ReadingState } from "../../domain/models/scripture";
import type { DomainEventPort } from "../ports/in/eventBus";
import type { ReadingStatePort } from "../ports/in/readingState";

interface ServiceParams {
  eventBus: DomainEventPort;
}

export class ReadingStateService implements ReadingStatePort {
  #eventBus: ServiceParams["eventBus"];
  #current: ReadingState | null = null;

  constructor({ eventBus }: ServiceParams) {
    this.#eventBus = eventBus;
  }

  setCurrentReading(bookId: string, chapterNumber: number): void {
    this.#current = { bookId, chapterNumber };
    this.#eventBus.emit("OnReadingStateChanged", { reading: this.#current });
  }

  getCurrentReading(): ReadingState | null {
    return this.#current;
  }
}
