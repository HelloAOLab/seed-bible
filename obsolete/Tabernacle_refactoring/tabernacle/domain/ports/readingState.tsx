export interface TabernacleReadingStatePort {
  getCurrentReading(): { bookId: string; chapterNumber: number } | null;
}
