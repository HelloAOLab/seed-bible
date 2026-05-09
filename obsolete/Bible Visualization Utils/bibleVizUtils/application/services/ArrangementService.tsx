import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
  BookInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type {
  ArrangementEventPort,
  ArrangementConfigProviderPort,
  CustomArrangementStorePort,
} from "bibleVizUtils.domain.ports.arrangement";

export interface TestamentPathIndices {
  arrangementIndex: number;
  testamentIndex: number;
}

export interface SectionPathIndices extends TestamentPathIndices {
  sectionIndex: number;
}

export interface BookPathIndices extends SectionPathIndices {
  bookIndex: number;
}

interface ArrangementServiceProps {
  arrangementConfigProviderPort: ArrangementConfigProviderPort;
  customArrangementStorePort: CustomArrangementStorePort;
  eventManager: ArrangementEventPort;
  arrangementIndex?: number;
}

export class ArrangementService {
  #arrangementConfigProviderPort: ArrangementServiceProps["arrangementConfigProviderPort"];
  #eventManager: ArrangementServiceProps["eventManager"];
  #currArrangementIndex: NonNullable<
    ArrangementServiceProps["arrangementIndex"]
  > = 0;
  #customArrangementStorePort: ArrangementServiceProps["customArrangementStorePort"];

  constructor({
    arrangementConfigProviderPort,
    eventManager,
    arrangementIndex,
    customArrangementStorePort,
  }: ArrangementServiceProps) {
    this.#arrangementConfigProviderPort = arrangementConfigProviderPort;
    this.#customArrangementStorePort = customArrangementStorePort;
    this.#eventManager = eventManager;
    if (arrangementIndex !== undefined)
      this.#currArrangementIndex = arrangementIndex;
  }

  getAllArrangements(): ArrangementInfo[] {
    const statics = this.#arrangementConfigProviderPort.getStaticArrangements();
    const custom = this.#customArrangementStorePort.getArrangements();

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

    const success =
      this.#customArrangementStorePort.tryAddArrangement(arrangement);
    if (success) {
      if (currentArrangementName) {
        this.setArrangementIndexByName(currentArrangementName);
      }
      this.#eventManager.emit("OnCustomArrangementsChanged");
    }
  }

  removeCustomArrangement(arrangement: ArrangementInfo): void {
    const currentArrangementName = this.getCurrentArrangementName();

    const success =
      this.#customArrangementStorePort.tryRemoveArrangement(arrangement);

    if (success) {
      if (
        currentArrangementName &&
        currentArrangementName !== arrangement.name
      ) {
        this.setArrangementIndexByName(currentArrangementName);
      } else {
        this.setCurrentArrangementIndex(0);
      }
      this.#eventManager.emit("OnCustomArrangementsChanged");
    }
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
