export interface ReaderNavigationPort {
  open(bookId: string, chapter?: number, verse?: number): void;
}
