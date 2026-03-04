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

interface TestamentPathIndices {
  arrangementIndex: number;
  testamentIndex: number;
}

interface SectionPathIndices extends TestamentPathIndices {
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
    if (index >= 0 && index < arrangementsLength) {
      this.#currArrangementIndex = index;
      // TODO: Move OnArrangementIndexChanged event call over here
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

    const success = this.setCurrentArrangementIndex(newIndex);

    if (success) {
      this.#eventManager.emit("OnArrangementIndexChanged", { newIndex });
    }
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
      const success = this.setCurrentArrangementIndex(0);
      if (success) {
        this.#eventManager.emit("OnArrangementIndexChanged", { newIndex: 0 });
      }
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
}
