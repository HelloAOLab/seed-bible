import type { BookNameConfigProviderPort } from "../../../application/ports/out/BookNameConfigProvider";
import { BOOK_NAMES } from "./bookNamesMap";

export class BookNameConfigProvider implements BookNameConfigProviderPort {
  getBookName(bookId: string): string {
    return BOOK_NAMES[bookId] ?? bookId;
  }
}
