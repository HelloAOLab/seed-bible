import type {
  ChapterInfo,
  BookStaticInfo,
  BookInfo,
  ArrangementInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import {
  GetExplodedViewBooksPositions,
  type HexString,
} from "bibleVizUtils.functions.index";
import type { StackPieceMeasurementsType } from "bibleVizUtils.data.StackPieceMeasurements";
import type { StackSpacingsType } from "bibleVizUtils.data.StackSpacings";

interface ArrangementTemplate {
  name: string;
  testaments: {
    name: string;
    color: HexString;
    sections: {
      name: string;
      color: HexString;
      books: {
        name: string;
        color: HexString;
        explodedViewPosition: {
          x: number;
          y: number;
          z: number;
        };
      }[];
    }[];
  }[];
}
type CompletePsalm = {
  chapter: number;
  book: "Psalms";
  bookId: "PSA";
};
type DividedPsalm = {
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
type GetFixedArrangementByTemplate = (
  template: ArrangementTemplate
) => ArrangementInfo;

interface ServiceRepository {
  getBookStaticInfo: (book: string) => BookStaticInfo | undefined;
  getCurrentArrangement: () => ArrangementInfo | undefined;
  getCurrentArrangementIndex: () => number;
  getArrangements: () => ArrangementInfo[];
  getArrangementByIndex: (params: {
    index: number;
  }) => ArrangementInfo | undefined;
  getStackPieceMeasurement: <K extends keyof StackPieceMeasurementsType>(
    measurement: K
  ) => StackPieceMeasurementsType[K];
  getStackSpacing: <K extends keyof StackSpacingsType>(
    spacing: K
  ) => StackSpacingsType[K];
}

export class ScriptureService {
  #repository: ServiceRepository;
  #biggerChapter: number | undefined;
  #biggerChapterArrangementIndex: number;

  constructor(repository: ServiceRepository) {
    this.#repository = repository;
    this.#biggerChapterArrangementIndex =
      this.#repository.getCurrentArrangementIndex();
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
    arrangementIndex = this.#repository.getCurrentArrangementIndex()
  ) => {
    if (
      this.#biggerChapterArrangementIndex !== arrangementIndex ||
      this.#biggerChapter === undefined
    ) {
      this.#biggerChapterArrangementIndex = arrangementIndex;
      const arrangement = this.#repository.getArrangementByIndex({
        index: arrangementIndex,
      });

      this.#biggerChapter = 0;

      if (arrangement) {
        let chapterInfo: ChapterInfo | undefined;

        for (const testament of arrangement.testaments) {
          for (const sectionInfo of testament.sections) {
            for (const book of sectionInfo.books) {
              const bookInfo = this.#repository.getBookStaticInfo(
                book.commonName
              );
              if (bookInfo) {
                const { chaptersInfo } = bookInfo;
                for (let i = 0; i < chaptersInfo.length; i++) {
                  chapterInfo = chaptersInfo[i];
                  if (chapterInfo) {
                    if (chapterInfo.amountOfVerses > this.#biggerChapter) {
                      this.#biggerChapter = chapterInfo.amountOfVerses;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return this.#biggerChapter;
  };

  getAmountOfChaptersInSection: (section: BookInfo[]) => number = (section) => {
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

  getSectionInfoPathByName: (
    name: string,
    arrangementIndex?: number
  ) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
    sectionIndex: number | undefined;
  } = (
    name,
    arrangementIndex = this.#repository.getCurrentArrangementIndex()
  ) => {
    const checkPathInArrangement: (arrangement: ArrangementInfo) =>
      | {
          found: true;
          data: {
            testamentIndex: number;
            sectionIndex: number;
          };
        }
      | {
          found: false;
        } = (arrangement) => {
      for (
        let currentTestamentIndex = 0;
        currentTestamentIndex < arrangement.testaments.length;
        currentTestamentIndex++
      ) {
        const testamentInfo = arrangement.testaments[currentTestamentIndex];
        if (testamentInfo) {
          const sectionIndex = testamentInfo.sections.findIndex(
            (section) => section.name === name
          );
          if (sectionIndex >= 0) {
            return {
              found: true,
              data: {
                testamentIndex: currentTestamentIndex,
                sectionIndex,
              },
            };
          }
        }
      }
      return { found: false };
    };

    let testamentIndex: number | undefined, sectionIndex: number | undefined;
    let found = false;
    const allArrangements = this.#repository.getArrangements();
    const initialArrangement = this.#repository.getArrangementByIndex({
      index: arrangementIndex,
    });
    if (initialArrangement) {
      allArrangements.splice(arrangementIndex, 1);
      allArrangements.unshift(initialArrangement);

      for (
        let currentArrangementIndex = 0;
        currentArrangementIndex < allArrangements.length;
        currentArrangementIndex++
      ) {
        const currentArrangement = allArrangements[currentArrangementIndex];
        if (currentArrangement) {
          const result = checkPathInArrangement(currentArrangement);
          if (result.found) {
            found = true;
            arrangementIndex = currentArrangementIndex;
            ({ testamentIndex, sectionIndex } = result.data);
            break;
          }
        }
      }
    }
    return { arrangementIndex, testamentIndex, sectionIndex, found };
  };

  /**
   * Searches for the path of a book in the Bible based on its common name, returning the arrangement, testament, and section where it is found.
   *
   * @param {Object} params - The context object containing the book's name.
   * @param {string} params.name - The common name of the book to find.
   * @returns {Object} - An object containing the indices of the arrangement, testament, and section where the book was found, and a boolean indicating whether it was found.
   * @returns {number} returns.arrangementIndex - The index of the arrangement containing the book.
   * @returns {number} returns.testamentIndex - The index of the testament containing the book.
   * @returns {string} returns.sectionIndex - The index of the section containing the book.
   * @returns {boolean} returns.found - Whether the book was found.
   * @example
   * const {arrangementIndex, testamentIndex, sectionIndex, found} = getBookInfoPathByName({name: "Genesis"});
   */
  getBookInfoPathByName: (params: {
    name: string;
    arrangementIndex?: number;
  }) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
    sectionIndex: number | undefined;
    bookIndex: number | undefined;
  } = ({
    name,
    arrangementIndex = this.#repository.getCurrentArrangementIndex(),
  }) => {
    const checkPathInArrangement: (arrangement: ArrangementInfo) =>
      | {
          found: true;
          data: {
            testamentIndex: number;
            sectionIndex: number;
            bookIndex: number;
          };
        }
      | {
          found: false;
        } = (arrangement) => {
      for (
        let currentTestamentIndex = 0;
        currentTestamentIndex < arrangement.testaments.length;
        currentTestamentIndex++
      ) {
        const testamentInfo = arrangement.testaments[currentTestamentIndex];
        if (testamentInfo) {
          for (
            let currentSectionIndex = 0;
            currentSectionIndex < testamentInfo.sections.length;
            currentSectionIndex++
          ) {
            const sectionInfo = testamentInfo.sections[currentSectionIndex];
            if (sectionInfo) {
              const bookIndex = sectionInfo.books.findIndex((bookInfo) => {
                return bookInfo.commonName == name;
              });
              if (bookIndex >= 0) {
                return {
                  found: true,
                  data: {
                    testamentIndex: currentTestamentIndex,
                    sectionIndex: currentSectionIndex,
                    bookIndex,
                  },
                };
              }
            }
          }
        }
      }
      return { found: false };
    };

    let testamentIndex: number | undefined,
      sectionIndex: number | undefined,
      bookIndex: number | undefined;
    let found = false;
    const allArrangements = this.#repository.getArrangements();
    const initialArrangement = this.#repository.getArrangementByIndex({
      index: arrangementIndex,
    });
    if (initialArrangement) {
      allArrangements.splice(arrangementIndex, 1);
      allArrangements.unshift(initialArrangement);

      for (
        let currentArrangementIndex = 0;
        currentArrangementIndex < allArrangements.length;
        currentArrangementIndex++
      ) {
        const currentArrangement = allArrangements[currentArrangementIndex];
        if (currentArrangement) {
          const result = checkPathInArrangement(currentArrangement);
          if (result.found) {
            found = true;
            arrangementIndex = currentArrangementIndex;
            ({ testamentIndex, sectionIndex, bookIndex } = result.data);
            break;
          }
        }
      }
    }
    return { arrangementIndex, testamentIndex, sectionIndex, bookIndex, found };
  };

  getBooksNamesBySectionName: (name: string) => string[] | null = (name) => {
    const { arrangementIndex, testamentIndex, sectionIndex, found } =
      this.getSectionInfoPathByName(name);
    if (found) {
      const arrangement = this.#repository.getArrangementByIndex({
        index: arrangementIndex,
      });
      if (arrangement) {
        const testament = arrangement.testaments[testamentIndex as number];
        if (testament) {
          const section = testament.sections[sectionIndex as number];
          if (section) {
            return section.books.map((currBook) => {
              return currBook.commonName;
            });
          }
        }
      }
    }
    return null;
  };

  getFixedArrangementByTemplate: GetFixedArrangementByTemplate = (template) => {
    const { name: templateName, testaments } = template;

    const fixedArrangement = {
      name: templateName,
      testaments: testaments.map((testament) => {
        const {
          name: testamentName,
          color: testamentColor,
          sections,
        } = testament;
        return {
          name: testamentName,
          color: testamentColor,
          sections: sections.map((section) => {
            const { books } = section;
            const amountOfChaptersInSection = this.getAmountOfChaptersInSection(
              books.map((book) => {
                return { commonName: book.name };
              })
            );
            const sectionDesiredScaleZ =
              amountOfChaptersInSection *
              this.#repository.getStackPieceMeasurement(
                "SectionDesiredScaleZRatio"
              );
            const sectionAvailableSpace =
              sectionDesiredScaleZ -
              this.#repository.getStackSpacing("BetweenBooks") *
                (books.length + 1);
            const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

            const booksScalesZ = books.map((book) => {
              const { name: bookName } = book;
              const chaptersCount =
                this.#repository.getBookStaticInfo(bookName)
                  ?.numberOfChapters ?? 0;
              const percentageOfBookInSection =
                chaptersCount / amountOfChaptersInSection;
              const bookScaleZ =
                percentageOfBookInSection * sectionAvailableSpace;
              return bookScaleZ;
            });
            const positions = GetExplodedViewBooksPositions({
              booksScalesZ,
              sectionExplodedViewScaleZ,
            });
            books.forEach((book, index) => {
              const positionZ = positions[index];
              book.explodedViewPosition = { x: 0, y: 0, z: positionZ ?? 0 };
            });

            return {
              name: section.name,
              color: section.color,
              books: books.map((book) => {
                return {
                  commonName: book.name,
                  customColor: book.color,
                  explodedViewPosition: book.explodedViewPosition,
                };
              }),
            };
          }),
        };
      }),
    };

    return fixedArrangement;
  };
}
