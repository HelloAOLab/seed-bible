import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackChapterData } from "../../domain/entities/StackChapterData";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface PieceDataRepositoryPort {
  getAllTestaments: () => StackTestamentData[];
  getAllSections: () => StackSectionData[];
  getAllBooks: () => StackBookData[];
  getAllChapters: () => StackChapterData[];
  getAllSectionBooks(): StackSectionBookData[];
}
