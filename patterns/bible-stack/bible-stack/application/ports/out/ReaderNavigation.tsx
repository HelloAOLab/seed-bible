export interface ReaderNavigationPort {
  open(bookId: string, chapter?: number): void;
}
