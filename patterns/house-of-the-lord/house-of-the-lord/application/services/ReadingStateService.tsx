import type { ReadingStatePort } from "../ports/in/readingState";

export class ReadingStateService implements ReadingStatePort {
  #current: { bookId: string; chapterNumber: number } | null = null;

  setCurrentReading(bookId: string, chapterNumber: number): void {
    this.#current = { bookId, chapterNumber };
  }

  getCurrentReading(): { bookId: string; chapterNumber: number } | null {
    return this.#current;
  }
}
