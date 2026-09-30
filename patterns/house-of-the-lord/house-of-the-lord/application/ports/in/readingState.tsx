import type { ReadingState } from "../../../domain/models/scripture";

export interface ReadingStatePort {
  setCurrentReading(bookId: string, chapterNumber: number): void;
  getCurrentReading(): ReadingState | null;
}
