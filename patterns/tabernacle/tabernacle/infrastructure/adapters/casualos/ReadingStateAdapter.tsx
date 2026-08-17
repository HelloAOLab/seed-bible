import type { TabernacleReadingStatePort } from "../../../domain/ports/readingState";

export class ReadingStateAdapter implements TabernacleReadingStatePort {
  #current: { bookId: string; chapterNumber: number } | null = null;

  setCurrentReading(bookId: string, chapterNumber: number): void {
    this.#current = { bookId, chapterNumber };
  }

  getCurrentReading(): { bookId: string; chapterNumber: number } | null {
    return this.#current;
  }
}
