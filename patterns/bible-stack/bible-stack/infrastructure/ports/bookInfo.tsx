import type { BookStaticInfoConfig } from "../models/arrangement";

export interface BooksStaticInfoRepositoryPort {
  getBookStaticInfo: (book: string) => BookStaticInfoConfig | undefined;
}
