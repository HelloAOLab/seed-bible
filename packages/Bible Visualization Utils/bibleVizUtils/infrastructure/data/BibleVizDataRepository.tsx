import type { BookStaticInfoConfig } from "bibleVizUtils.infrastructure.models.arrangement";
import { BooksStaticInfo } from "bibleVizUtils.infrastructure.data.booksStaticInfo";
import { TestamentNames } from "bibleVizUtils.infrastructure.data.testamentNames";
import type { BooksStaticInfoRepository } from "bibleVizUtils.domain.ports.arrangement";

export class BibleVizDataRepository implements BooksStaticInfoRepository {
  getBooksStaticInfo(): typeof BooksStaticInfo {
    return BooksStaticInfo;
  }

  getBookStaticInfo(book: string): BookStaticInfoConfig | undefined {
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
