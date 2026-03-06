import type {
  AvailableTranslations,
  TranslationBookChapter,
  TranslationBooks,
} from "./FreeUseBibleAPI";

export interface ReaderTabReadingData {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number;
  availableTranslations: AvailableTranslations | null;
  translationBooks: TranslationBooks | null;
  chapterData: TranslationBookChapter | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface ReaderTab {
  id: string;
  title: string;
  reading: ReaderTabReadingData;
}

export class TabsManager {
  createDefaultReadingData(): ReaderTabReadingData {
    return {
      translationId: "BSB",
      bookId: null,
      chapterNumber: 1,
      availableTranslations: null,
      translationBooks: null,
      chapterData: null,
      loading: false,
      error: null,
      isInitialized: false,
    };
  }

  createInitialTabs(): ReaderTab[] {
    return [
      { id: "tab-1", title: "Tab 1", reading: this.createDefaultReadingData() },
      { id: "tab-2", title: "Tab 2", reading: this.createDefaultReadingData() },
    ];
  }

  getInitialSelectedTabId(tabs: ReaderTab[]): string | null {
    return tabs.at(0)?.id ?? null;
  }

  createNextTab(tabs: ReaderTab[]): ReaderTab {
    const nextNumber = tabs.length + 1;
    return {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      reading: this.createDefaultReadingData(),
    };
  }
}
