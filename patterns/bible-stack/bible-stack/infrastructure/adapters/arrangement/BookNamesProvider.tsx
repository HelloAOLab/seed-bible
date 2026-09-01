/**
 * Serves book display names from an injected `Record<bookId, name>` map. The
 * map is snapshotted by the core app into `configBot.tags.bookNames` and parsed
 * at the composition root, so this adapter stays decoupled from `configBot`.
 */
export class BookNamesProvider {
  #bookNames: Record<string, string>;

  constructor(bookNames: Record<string, string>) {
    this.#bookNames = bookNames;
  }

  getBookName = (bookId: string): string | undefined => {
    return this.#bookNames[bookId];
  };
}
