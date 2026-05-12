import type { BookStaticInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import { BooksStaticInfo } from "bibleVizUtils.infrastructure.data.booksStaticInfo";
import { TestamentNames } from "bibleVizUtils.infrastructure.data.testamentNames";
import type { BooksStaticInfoRepository } from "bibleVizUtils.domain.ports.arrangement";

class BibleVizDataRepository implements BooksStaticInfoRepository {
  getBooksStaticInfo(): typeof BooksStaticInfo {
    return BooksStaticInfo;
  }

  getBookStaticInfo<K extends keyof typeof BooksStaticInfo>(
    book: K
  ): BookStaticInfo {
    return BooksStaticInfo[book];
  }

  getTestamentNames() {
    return TestamentNames;
  }

  getTestamentName<K extends keyof typeof TestamentNames>(
    key: K
  ): (typeof TestamentNames)[K] {
    return TestamentNames[key];
  }
}

export { BibleVizDataRepository };
export type { BookStaticInfo };
