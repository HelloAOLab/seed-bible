import type { BookStaticInfoConfig } from "../models/arrangement";
import { BooksStaticInfo } from "./booksStaticInfo";
import { TestamentNames } from "./testamentNames";
import type { BooksStaticInfoRepository } from "@packages/seed-bible-utils/domain/ports/arrangement";

export class DataRepository implements BooksStaticInfoRepository {
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
