import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface BibleRecenterAdapterPort {
  isBibleOffScreen(bible: StackBibleData): Promise<boolean>;
  recenter(bible: StackBibleData): Promise<void>;
}
