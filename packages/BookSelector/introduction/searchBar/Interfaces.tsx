interface BookInterface {
  id: string;
  translationId: string;
  name: string;
  commonName: string;
  title: string;
  order: number;
  numberOfChapters: number;
  sha256?: string;
  firstChapterNumber: number;
  firstChapterApiLink: string;
  lastChapterNumber: number;
  lastChapterApiLink: string;
  totalNumberOfVerses?: number;
}

interface TranslationInterface {
  id: string;
  name: string;
  website: string | null;
  licenseUrl: string | null;
  licenseNotes: string | null;
  shortName: string;
  englishName: string;
  language: string;
  textDirection: string;
  sha256: string;
  availableFormats: string[];
  listOfBooksApiLink: string;
  numberOfBooks: number;
  totalNumberOfChapters: number;
  totalNumberOfVerses: number;
  languageName: string;
  languageEnglishName: string;
  origin?: string;
}

export type { BookInterface, TranslationInterface };
