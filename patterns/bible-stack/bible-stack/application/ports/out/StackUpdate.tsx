import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackPieceDataMap } from "../pieces";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
  getBibleDataById(id: StackBibleData["id"]): StackBibleData | undefined;
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getStandaloneSections(): StackSectionData[];
  getStandaloneSectionBooks(): StackSectionBookData[];
  getStandaloneBooks(): StackBookData[];
  getDataById<K extends keyof StackPieceDataMap>(params: {
    type: K;
    id: StackPieceDataMap[K]["id"];
  }): StackPieceDataMap[K] | undefined;
}
