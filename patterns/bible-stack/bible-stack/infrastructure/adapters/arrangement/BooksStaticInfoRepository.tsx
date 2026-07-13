import type { BooksStaticInfoRepositoryPort } from "../../ports/bookInfo";
import type { BookStaticInfoConfig } from "../../models/arrangement";

/**
 * Serves static book info from an injected `Record<bookId, BookStaticInfoConfig>`
 * map. The map is snapshotted by the core app into
 * `configBot.tags.booksStaticInfo` and parsed at the composition root, so this
 * adapter stays decoupled from `configBot`.
 */
export class BooksStaticInfoRepository implements BooksStaticInfoRepositoryPort {
  #booksStaticInfo: Record<string, BookStaticInfoConfig>;

  constructor(booksStaticInfo: Record<string, BookStaticInfoConfig>) {
    this.#booksStaticInfo = booksStaticInfo;
  }

  getBookStaticInfo(bookId: string): BookStaticInfoConfig | undefined {
    return this.#booksStaticInfo[bookId];
  }
}
