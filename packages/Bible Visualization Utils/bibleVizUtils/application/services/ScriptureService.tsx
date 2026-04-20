import type {
  ChapterInfo,
  BookInfo,
  ArrangementInfo,
  BookStaticInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type { BookName } from "bibleVizUtils.domain.models.scripture";

export type CompletePsalm = {
  chapter: number;
  book: "Psalms";
  bookId: "PSA";
};
export type DividedPsalm = {
  chapter: number;
  book: string;
  bookId: string;
};
type ConvertDividedPsalmsToCompleteType = (params: {
  book: BookName;
  chapter: number;
}) => CompletePsalm;
type ConvertCompletePsalmsToDividedType = (params: {
  chapter: number;
}) => DividedPsalm;
type GetBiggerChapterType = (arrangementIndex?: number) => number;

interface DataRepositoryPort {
  getBookStaticInfo: (book: BookName) => BookStaticInfo;
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

  convertDividedPsalmsToComplete: ConvertDividedPsalmsToCompleteType = ({
    book,
    chapter,
  }) => {
    const dividedPsalmInfo = this.#dataRepositoryPort.getBookStaticInfo(book);

    if (dividedPsalmInfo && dividedPsalmInfo.startingIndex !== undefined) {
      return {
        chapter: chapter + dividedPsalmInfo.startingIndex,
        book: "Psalms",
        bookId: "PSA",
      };
    }

    throw new Error(
      "Divided psalm info not found at convertDividedPsalmsToComplete"
    );
  };

  convertCompletePsalmsToDivided: ConvertCompletePsalmsToDividedType = ({
    chapter,
  }) => {
    const dividedPsalmsNames: BookName[] = [
      "1 Psalms",
      "2 Psalms",
      "3 Psalms",
      "4 Psalms",
      "5 Psalms",
    ];

    const dividedPaslmsInfo: [string, BookStaticInfo | undefined][] =
      dividedPsalmsNames.map((name) => {
        return [name, this.#dataRepositoryPort.getBookStaticInfo(name)];
      });

    const psalmInfo: [string, BookStaticInfo] | undefined =
      dividedPaslmsInfo.find(([, info]) => {
        if (info) {
          const { startingIndex } = info;
          if (startingIndex !== undefined) {
            return (
              startingIndex + 1 <= chapter &&
              chapter <= startingIndex + info.numberOfChapters
            );
          }
        }
        return false;
      }) as [string, BookStaticInfo] | undefined;

    if (psalmInfo) {
      const [name, info] = psalmInfo;
      return {
        book: name,
        bookId: info.abbreviation,
        chapter: chapter - (info?.startingIndex ?? 0),
      };
    }

    throw new Error("Psalm info not found at convertCompletePsalmsToDivided");
  };

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

      let chapterInfo: ChapterInfo | undefined;

      for (const testament of arrangement.testaments) {
        for (const sectionInfo of testament.sections) {
          for (const book of sectionInfo.books) {
            const bookInfo = this.#dataRepositoryPort.getBookStaticInfo(
              book.commonName
            );
            if (!bookInfo) {
              throw new Error(
                "ScriptureService: bookInfo not found at getBiggerChapter"
              );
            }
            const { chaptersInfo } = bookInfo;
            for (let i = 0; i < chaptersInfo.length; i++) {
              chapterInfo = chaptersInfo[i];
              if (!chapterInfo) {
                throw new Error(
                  "ScriptureService: chapterInfo not found at getBiggerChapter"
                );
              }
              if (chapterInfo.amountOfVerses > this.#biggerChapter) {
                this.#biggerChapter = chapterInfo.amountOfVerses;
              }
            }
          }
        }
      }
    }

    return this.#biggerChapter;
  };

  getSectionChapterCount: (section: BookInfo[]) => number = (section) => {
    const values = section.map((bookInfo) => {
      return bookInfo.numberOfChapters ?? 0;
    });
    return values.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);
  };

  getBookChapterCount(book: BookName): number {
    const bookInfo = this.#dataRepositoryPort.getBookStaticInfo(book);
    if (!bookInfo)
      throw new Error(
        `ScriptureService: bookStaticInfo not found at getBookChapterCount for ${book}`
      );
    return bookInfo.numberOfChapters;
  }
}
