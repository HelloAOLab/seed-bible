import type {
  BookInfo,
  ArrangementInfo,
  SubsetBookInfo,
} from "bibleVizUtils.domain.models.arrangement";

export type CompleteBookChapter = {
  chapter: number;
  bookId: string;
};

export type SubsetBookChapter = {
  chapter: number;
  bookId: string;
  completeBookId: string;
};

type GetBiggerChapterType = (arrangementIndex?: number) => number;

interface DataRepositoryPort {
  getBookStaticInfo: (bookId: string) =>
    | {
        chaptersVerseCount: readonly number[];
        numberOfChapters: number;
      }
    | undefined;
}

interface ArrangementServicePort {
  getAllArrangements: () => ArrangementInfo[];
  getCurrentArrangementIndex: () => number;
  getArrangementByIndex: (index: number) => ArrangementInfo | undefined;
}

export class ScriptureService {
  #dataRepositoryPort: DataRepositoryPort;
  #arrangementServicePort: ArrangementServicePort;
  #biggerChapter: number | undefined;
  #biggerChapterArrangementIndex: number;

  constructor(
    dataRepositoryPort: DataRepositoryPort,
    arrangementServicePort: ArrangementServicePort
  ) {
    this.#dataRepositoryPort = dataRepositoryPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#biggerChapterArrangementIndex =
      this.#arrangementServicePort.getCurrentArrangementIndex();
  }

  mapSubsetToCompleteBook({
    book,
    chapter,
  }: {
    book: SubsetBookInfo;
    chapter: number;
  }): CompleteBookChapter {
    return {
      chapter: chapter + (book.startIndex ?? 0),
      bookId: book.completeBookId,
    };
  }

  mapCompleteToSubsetBook({
    chapter,
    subsets,
  }: {
    chapter: number;
    subsets: readonly SubsetBookInfo[];
  }): SubsetBookChapter {
    const subset = subsets.find((s) => {
      const start = (s.startIndex ?? 0) + 1;
      const end = (s.startIndex ?? 0) + s.numberOfChapters;
      return start <= chapter && chapter <= end;
    });

    if (!subset) {
      throw new Error(
        `ScriptureService: no subset found for chapter ${chapter} at mapCompleteToSubsetBook`
      );
    }

    return {
      chapter: chapter - (subset.startIndex ?? 0),
      bookId: subset.bookId,
      completeBookId: subset.completeBookId,
    };
  }

  getBiggerChapter: GetBiggerChapterType = (
    arrangementIndex = this.#arrangementServicePort.getCurrentArrangementIndex()
  ) => {
    if (
      this.#biggerChapterArrangementIndex !== arrangementIndex ||
      this.#biggerChapter === undefined
    ) {
      this.#biggerChapterArrangementIndex = arrangementIndex;
      const arrangement =
        this.#arrangementServicePort.getArrangementByIndex(arrangementIndex);

      this.#biggerChapter = 0;

      if (!arrangement) {
        throw new Error(
          "ScriptureService: arrangement not found at getBiggerChapter"
        );
      }

      let currentCount = 0;

      for (const testament of arrangement.testaments) {
        for (const sectionInfo of testament.sections) {
          for (const book of sectionInfo.books) {
            const bookInfo = this.#dataRepositoryPort.getBookStaticInfo(
              book.bookId
            );
            if (!bookInfo) {
              throw new Error(
                "ScriptureService: bookInfo not found at getBiggerChapter"
              );
            }
            const { chaptersVerseCount } = bookInfo;
            for (let i = 0; i < chaptersVerseCount.length; i++) {
              currentCount = chaptersVerseCount[i]!;
              if (currentCount > this.#biggerChapter!) {
                this.#biggerChapter = currentCount;
              }
            }
          }
        }
      }
    }

    return this.#biggerChapter;
  };

  getSectionChapterCount: (section: readonly BookInfo[]) => number = (
    section
  ) => {
    const values = section.map((bookInfo) => {
      return bookInfo.numberOfChapters ?? 0;
    });
    return values.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);
  };

  getBookChapterCount(bookId: string): number {
    const bookInfo = this.#dataRepositoryPort.getBookStaticInfo(bookId);
    if (!bookInfo)
      throw new Error(
        `ScriptureService: bookStaticInfo not found at getBookChapterCount for ${bookId}`
      );
    return bookInfo.numberOfChapters;
  }
}
