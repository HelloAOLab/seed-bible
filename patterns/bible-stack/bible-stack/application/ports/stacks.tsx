import type { StackBibleData } from "../../domain/entities/StackBibleData";

export interface BibleDataRepositoryPort {
  addBibleData: (data: StackBibleData) => void;
  removeBibleData: (data: StackBibleData) => void;
  clearBiblesData: () => StackBibleData[];
  getBibleDataById: (id: StackBibleData["id"]) => StackBibleData | undefined;
  getAllBiblesData: () => StackBibleData[];
}
