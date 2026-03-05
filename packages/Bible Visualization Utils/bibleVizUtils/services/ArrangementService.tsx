import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
  BookInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";

interface ServiceRepository {
  getStaticArrangements: () => ArrangementInfo[];
  getCustomArrangements: () => ArrangementInfo[];
  setCustomArrangements: (arrangements: ArrangementInfo[]) => void;
}

interface ServiceEventManager {
  emit: (
    eventName: "OnArrangementIndexChanged" | "OnCustomArrangementsChanged",
    payload?: { newIndex: number }
  ) => void;
}

export interface TestamentPathIndices {
  arrangementIndex: number;
  testamentIndex: number;
}

export interface SectionPathIndices extends TestamentPathIndices {
  sectionIndex: number;
}

interface BookPathIndices extends SectionPathIndices {
  bookIndex: number;
}

export class ArrangementService {
  #repository: ServiceRepository;
  #eventManager: ServiceEventManager;
  #currArrangementIndex: number;

  constructor(
    repository: ServiceRepository,
    eventManager: ServiceEventManager,
    arrangementIndex?: number
  ) {
    this.#repository = repository;
    this.#eventManager = eventManager;
    if (arrangementIndex !== undefined)
      this.#currArrangementIndex = arrangementIndex;
    else this.#currArrangementIndex = 0;
  }

  getAllArrangements(): ArrangementInfo[] {
    const statics = this.#repository.getStaticArrangements();
    const custom = this.#repository.getCustomArrangements();

    return [...statics, ...custom];
  }

  getCurrentArrangementIndex(): number {
    return this.#currArrangementIndex;
  }

  setCurrentArrangementIndex(index: number): boolean {
    const arrangementsLength = this.getAllArrangements().length;
    const currentIndex = this.getCurrentArrangementIndex();
    if (index >= 0 && index < arrangementsLength && index !== currentIndex) {
      this.#currArrangementIndex = index;
      this.#eventManager.emit("OnArrangementIndexChanged", { newIndex: index });
      return true;
    }
    return false;
  }

  setArrangementIndexByName(name: string): void {
    const arrangements = this.getAllArrangements();
    const newIndex = arrangements.findIndex((arrangement) => {
      return arrangement.name === name;
    });

    if (newIndex === -1) return;

    if (this.#currArrangementIndex === newIndex) return;

    this.setCurrentArrangementIndex(newIndex);
  }

  getArrangementIndexByName: (name: string) => number = (name) => {
    return this.getAllArrangements().findIndex((arrangementInfo) => {
      return arrangementInfo.name === name;
    });
  };

  getCurrentArrangement(): ArrangementInfo | undefined {
    return this.getAllArrangements()[this.getCurrentArrangementIndex()];
  }

  getCurrentArrangementName(): string | undefined {
    return this.getCurrentArrangement()?.name;
  }

  addCustomArrangement(arrangement: ArrangementInfo): void {
    const currentArrangementName = this.getCurrentArrangementName();
    const customArrangements = this.#repository.getCustomArrangements();

    const alreadyExists = customArrangements.some((customArrangement) => {
      return customArrangement.name === arrangement.name;
    });

    if (!alreadyExists) {
      this.#repository.setCustomArrangements([
        ...customArrangements,
        arrangement,
      ]);
      if (currentArrangementName) {
        this.setArrangementIndexByName(currentArrangementName);
      }
      this.#eventManager.emit("OnCustomArrangementsChanged");
    }
  }

  removeCustomArrangement(arrangement: ArrangementInfo): void {
    const currentArrangementName = this.getCurrentArrangementName();
    const customArrangements = this.#repository.getCustomArrangements();

    const exists = customArrangements.some((customArrangement) => {
      return customArrangement.name === arrangement.name;
    });

    if (!exists) return;

    this.#repository.setCustomArrangements(
      customArrangements.filter((customArrangement) => {
        return customArrangement.name !== arrangement.name;
      })
    );

    if (currentArrangementName && currentArrangementName !== arrangement.name) {
      this.setArrangementIndexByName(currentArrangementName);
    } else {
      this.setCurrentArrangementIndex(0);
    }
    this.#eventManager.emit("OnCustomArrangementsChanged");
  }

  getArrangementByIndex: (index: number) => ArrangementInfo | undefined = (
    index
  ) => {
    return this.getAllArrangements()[index];
  };

  getTestamentByIndices(path: TestamentPathIndices): TestamentInfo | undefined {
    const { arrangementIndex, testamentIndex } = path;
    const arrangement = this.getArrangementByIndex(arrangementIndex);
    return arrangement?.testaments[testamentIndex];
  }

  getSectionByIndices(path: SectionPathIndices): SectionInfo | undefined {
    const testament = this.getTestamentByIndices(path);
    return testament?.sections[path.sectionIndex];
  }

  getBookByIndices(path: BookPathIndices): BookInfo | undefined {
    const section = this.getSectionByIndices(path);

    return section?.books[path.bookIndex];
  }

  getTestamentInfoPathByName: (
    name: string,
    arrangementIndex?: number
  ) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
  } = (name, arrangementIndex = this.getCurrentArrangementIndex()) => {
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

    let testamentIndex: number | undefined;
    let found = false;
    const allArrangements = this.getAllArrangements();
    const initialArrangement = this.getArrangementByIndex(arrangementIndex);
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
            ({ testamentIndex } = result.data);
            break;
          }
        }
      }
    }
    return { arrangementIndex, testamentIndex, found };
  };

  getSectionInfoPathByName: (
    name: string,
    arrangementIndex?: number
  ) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
    sectionIndex: number | undefined;
  } = (name, arrangementIndex = this.getCurrentArrangementIndex()) => {
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
    const allArrangements = this.getAllArrangements();
    const initialArrangement = this.getArrangementByIndex(arrangementIndex);
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
  } = ({ name, arrangementIndex = this.getCurrentArrangementIndex() }) => {
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
    const allArrangements = this.getAllArrangements();
    const initialArrangement = this.getArrangementByIndex(arrangementIndex);
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
      const arrangement = this.getArrangementByIndex(arrangementIndex);
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
}
