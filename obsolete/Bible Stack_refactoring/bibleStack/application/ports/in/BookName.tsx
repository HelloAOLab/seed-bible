export interface BookNameProviderPort {
  getBookName(bookId: string): string | undefined;
}
