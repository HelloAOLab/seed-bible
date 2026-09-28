import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackBookData } from "../../../domain/entities/StackBookData";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getStandaloneSections(): StackSectionData[];
  getStandaloneSectionBooks(): StackSectionBookData[];
  getStandaloneBooks(): StackBookData[];
}
