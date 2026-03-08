import type {
  ChapterInfo,
  BookStaticInfo,
  BookInfo,
  ArrangementInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackPieceMeasurementsType } from "bibleVizUtils.data.StackPieceMeasurements";
import type { StackSpacingsType } from "bibleVizUtils.data.StackSpacings";

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
  book: string;
  chapter: number;
}) => CompletePsalm;
type ConvertCompletePsalmsToDividedType = (params: {
  chapter: number;
}) => DividedPsalm;
type GetBiggerChapterType = (arrangementIndex?: number) => number;

interface ServiceRepository {
  getBookStaticInfo: (book: string) => BookStaticInfo | undefined;
  getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K];
  getStackSpacing: <K extends keyof StackSpacingsType>(
    spacing: K
  ) => StackSpacingsType[K];
}

interface ArrangementService {
  getAllArrangements: () => ArrangementInfo[];
  getCurrentArrangementIndex: () => number;
  getArrangementByIndex: (index: number) => ArrangementInfo | undefined;
}

export class ScriptureService {
  #repository: ServiceRepository;
  #arrangementService: ArrangementService;
  #biggerChapter: number | undefined;
  #biggerChapterArrangementIndex: number;

  constructor(
    repository: ServiceRepository,
    arrangementService: ArrangementService
  ) {
    this.#repository = repository;
    this.#arrangementService = arrangementService;
    this.#biggerChapterArrangementIndex =
      this.#arrangementService.getCurrentArrangementIndex();
  }

  convertDividedPsalmsToComplete: ConvertDividedPsalmsToCompleteType = ({
    book,
    chapter,
  }) => {
    const dividedPsalmInfo = this.#repository.getBookStaticInfo(book);

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
    const dividedPsalmsNames = [
      "1 Psalms",
      "2 Psalms",
      "3 Psalms",
      "4 Psalms",
      "5 Psalms",
    ];

    const dividedPaslmsInfo: [string, BookStaticInfo | undefined][] =
      dividedPsalmsNames.map((name) => {
        return [name, this.#repository.getBookStaticInfo(name)];
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
    arrangementIndex = this.#arrangementService.getCurrentArrangementIndex()
  ) => {
    if (
      this.#biggerChapterArrangementIndex !== arrangementIndex ||
      this.#biggerChapter === undefined
    ) {
      this.#biggerChapterArrangementIndex = arrangementIndex;
      const arrangement =
        this.#arrangementService.getArrangementByIndex(arrangementIndex);

      this.#biggerChapter = 0;

      if (!arrangement) {
        console.error(
          `arrangement not found at ScriptureService.getBiggerChapter`
        );
        return this.#biggerChapter;
      }

      let chapterInfo: ChapterInfo | undefined;

      for (const testament of arrangement.testaments) {
        for (const sectionInfo of testament.sections) {
          for (const book of sectionInfo.books) {
            const bookInfo = this.#repository.getBookStaticInfo(
              book.commonName
            );
            if (!bookInfo) {
              console.error(
                `bookInfo not found at ScriptureService.getBiggerChapter`
              );
              return this.#biggerChapter;
            }
            const { chaptersInfo } = bookInfo;
            for (let i = 0; i < chaptersInfo.length; i++) {
              chapterInfo = chaptersInfo[i];
              if (!chapterInfo) {
                console.error(
                  `chapterInfo not found at ScriptureService.getBiggerChapter`
                );
                return this.#biggerChapter;
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
      return (
        this.#repository.getBookStaticInfo(bookInfo.commonName)
          ?.numberOfChapters ?? 0
      );
    });
    return values.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);
  };

  getBookChapterCount(book: string): number {
    const bookInfo = this.#repository.getBookStaticInfo(book);
    if (!bookInfo)
      throw new Error(
        `bookStaticInfo not found at ScriptureService.getBookChapterCount for ${book}`
      );
    return bookInfo.numberOfChapters;
  }
}
