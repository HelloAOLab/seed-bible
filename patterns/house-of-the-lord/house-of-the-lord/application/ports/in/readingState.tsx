export interface ReadingStatePort {
  setCurrentReading(bookId: string, chapterNumber: number): void;
  getCurrentReading(): { bookId: string; chapterNumber: number } | null;
}
