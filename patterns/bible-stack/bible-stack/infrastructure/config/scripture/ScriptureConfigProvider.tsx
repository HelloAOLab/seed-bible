import { BooksStaticInfo } from "./booksStaticInfo";
import type { BookStaticInfoConfig } from "../../models/arrangement";

/**
 * Provides the static, canonical per-book scripture metadata (chapters, verse
 * counts, author, date range). This data is the same for everyone, so instead
 * of the host sending it through the pattern's config-bot tags (which blew up
 * the iframe URL past the server's size limit), the pattern bundles its own
 * copy and reads it from here.
 */
export class ScriptureConfigProvider {
  getBooksStaticInfo(): Record<string, BookStaticInfoConfig> {
    return BooksStaticInfo;
  }

  getBookStaticInfo(book: string): BookStaticInfoConfig | undefined {
    return BooksStaticInfo[book];
  }
}
