import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
  BookInfo,
  SubsetBookInfo,
} from "../../domain/models/arrangement";
import type {
  TestamentPathIndices,
  SectionPathIndices,
  BookPathIndices,
} from "../../domain/models/arrangement";
import type { BookInfoPathGetter } from "../ports/in/Arrangement";

interface ArrangementServiceProps {
  arrangement: ArrangementInfo;
}

export class ArrangementService implements BookInfoPathGetter {
  #arrangement: ArrangementInfo;

  constructor({ arrangement }: ArrangementServiceProps) {
    this.#arrangement = arrangement;
  }

  getCurrentArrangementName(): string | undefined {
    return this.#arrangement.name;
  }

  getTestamentByIndices(path: TestamentPathIndices): TestamentInfo | undefined {
    const { testamentIndex } = path;
    return this.#arrangement.testaments[testamentIndex];
  }

  getSectionByIndices(path: SectionPathIndices): SectionInfo | undefined {
    const testament = this.getTestamentByIndices(path);
    return testament?.sections[path.sectionIndex];
  }

  getBookByIndices(path: BookPathIndices): BookInfo | undefined {
    const section = this.getSectionByIndices(path);

    return section?.books[path.bookIndex];
  }

  getTestamentInfoPathByName: (name: string) => {
    found: boolean;
    testamentIndex?: number | undefined;
  } = (name) => {
    const checkPathInArrangement: (arrangement: ArrangementInfo) =>
      | {
          found: true;
          data: {
            testamentIndex: number;
          };
        }
      | {
          found: false;
        } = (arrangement) => {
      const testamentIndex = arrangement.testaments.findIndex(
        (testament) => testament.name === name
      );
      if (testamentIndex >= 0) {
        return {
          found: true,
          data: {
            testamentIndex,
          },
        };
      }
      return { found: false };
    };

    const result = checkPathInArrangement(this.#arrangement);
    if (result.found) {
      return { found: true, testamentIndex: result.data.testamentIndex };
    }
    return { found: false };
  };

  getSectionInfoPathByName: (name: string) => {
    found: boolean;
    testamentIndex?: number | undefined;
    sectionIndex?: number | undefined;
  } = (name) => {
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

    const result = checkPathInArrangement(this.#arrangement);
    if (result.found) {
      return { found: true, ...result.data };
    }

    return { found: false };
  };

  getBookInfoPathById: (params: { id: string }) => {
    found: boolean;
    testamentIndex?: number | undefined;
    sectionIndex?: number | undefined;
    bookIndex?: number | undefined;
  } = ({ id }) => {
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
                return bookInfo.bookId === id;
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

    const result = checkPathInArrangement(this.#arrangement);
    if (result.found) {
      return { found: true, ...result.data };
    }
    return { found: false };
  };

  getBookSubsetByCompleteId({
    id,
    chapterNumber,
  }: {
    id: string;
    chapterNumber: number;
  }): SubsetBookInfo | undefined {
    for (const testament of this.#arrangement.testaments) {
      for (const section of testament.sections) {
        for (const book of section.books) {
          if (book.type === "subset" && book.completeBookId === id) {
            const start = (book.startIndex ?? 0) + 1;
            const end = (book.startIndex ?? 0) + book.numberOfChapters;
            if (start <= chapterNumber && chapterNumber <= end) {
              return book;
            }
          }
        }
      }
    }

    return undefined;
  }

  getBooksNamesBySectionName: (name: string) => string[] | null = (name) => {
    const { testamentIndex, sectionIndex, found } =
      this.getSectionInfoPathByName(name);
    if (found) {
      const testament = this.#arrangement.testaments[testamentIndex as number];
      if (testament) {
        const section = testament.sections[sectionIndex as number];
        if (section) {
          return section.books.map((currBook) => {
            return currBook.bookId;
          });
        }
      }
    }
    return null;
  };
}
