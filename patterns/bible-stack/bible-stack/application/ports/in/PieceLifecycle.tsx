import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { ChapterInfo } from "../../../domain/models/arrangement";
import type { Piece } from "../../../domain/models/canvas";
import type { VersesBundleData } from "../../../domain/entities/VersesBundleData";
import type { VerseData } from "../../../domain/entities/VerseData";

export interface PieceLifecycleServicePort {
  createTestament: (params: {
    arrangementIndex: number;
    testamentIndex: number;
    bibleDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }) => StackTestamentData;
  createSection: (params: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }) => StackSectionData | StackSectionBookData;
  createBook(params: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    levelIndex: number;
    bookIndex: number;
    bookLevelIndex: number;
    levelsLenght: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    isInsideSection: boolean;
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    sectionDataId?: string | undefined;
    isHidden?: boolean | undefined;
  }): StackBookData;
  createChapter(params: {
    bibleDataId?: string | undefined;
    testamentDataId?: string | undefined;
    sectionDataId?: string | undefined;
    sectionBookDataId?: string | undefined;
    bookDataId?: string | undefined;
    isHidden?: boolean | undefined;
    isInsideBible: boolean;
    isInsideBook: boolean;
    chapterInfo: ChapterInfo;
    bookId: string;
  }): StackChapterData;
  createVerseBundle(params: {
    start: number;
    count: number;
    bookId: string;
    chapter: number;
  }): VersesBundleData;
  createVerse(params: {
    start: number;
    count: number;
    bookId: string;
    chapter: number;
    verseIndex: number;
  }): VerseData;
  clearPiece: (piece: Piece) => Promise<void>;
  deleteTestament(testament: StackTestamentData): void;
  deleteTestaments(testaments: StackTestamentData[]): void;
  deleteSection(section: StackSectionData): void;
  deleteSections(sections: StackSectionData[]): void;
  deleteSectionBook(sectionBook: StackSectionBookData): void;
  deleteSectionBooks(sectionBooks: StackSectionBookData[]): void;
  deleteBook(book: StackBookData): void;
  deleteBooks(books: StackBookData[]): void;
  deleteChapter(chapter: StackChapterData): void;
  deleteChapters(chapters: StackChapterData[]): void;
  deleteVersesBundle(bundle: VersesBundleData): void;
  deleteVerse(verse: VerseData): void;
}
