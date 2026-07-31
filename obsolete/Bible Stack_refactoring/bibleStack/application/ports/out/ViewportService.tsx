import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getStandaloneSections(): StackSectionData[];
  getStandaloneSectionBooks(): StackSectionBookData[];
  getStandaloneBooks(): StackBookData[];
}
