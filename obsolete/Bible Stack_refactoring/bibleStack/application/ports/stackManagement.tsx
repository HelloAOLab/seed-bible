import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";

export interface BibleLifecycleServicePort {
  deleteBibles: (biblesData: StackBibleData[]) => void;
}

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface PieceLifecycleServicePort {
  deleteTestaments: (testaments: StackTestamentData[]) => void;
  deleteSections: (sections: StackSectionData[]) => void;
  deleteSectionBooks(sectionBooks: StackSectionBookData[]): void;
  deleteBooks: (books: StackBookData[]) => void;
  deleteChapters: (chapters: StackChapterData[]) => void;
}

export interface PieceDataRepositoryPort {
  getAllTestaments: () => StackTestamentData[];
  getAllSections: () => StackSectionData[];
  getAllBooks: () => StackBookData[];
  getAllChapters: () => StackChapterData[];
  getAllSectionBooks(): StackSectionBookData[];
}
