import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import type { StackPieceDataMap } from "bibleStack.application.ports.pieces";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
  getBibleDataById(id: StackBibleData["id"]): StackBibleData | undefined;
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getStandaloneSections(): StackSectionData[];
  getStandaloneSectionBooks(): StackSectionBookData[];
  getStandaloneBooks(): StackBookData[];
  getDataById<K extends keyof StackPieceDataMap>(
    type: K,
    id: StackPieceDataMap[K]["id"]
  ): StackPieceDataMap[K] | undefined;
}
