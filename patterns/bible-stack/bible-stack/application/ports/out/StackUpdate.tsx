import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { PieceDataMap } from "../../../domain/models/canvas";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
  getBibleDataById(id: StackBibleData["id"]): StackBibleData | undefined;
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getStandaloneSections(): StackSectionData[];
  getStandaloneSectionBooks(): StackSectionBookData[];
  getStandaloneBooks(): StackBookData[];
  getDataById<K extends keyof PieceDataMap>(params: {
    type: K;
    id: PieceDataMap[K]["id"];
  }): PieceDataMap[K] | undefined;
}
