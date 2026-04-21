import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

export interface ExplodedViewServicePort {
  explodeSection: (data: StackSectionData) => void;
  implodeSection: (data: StackSectionData) => void;
}
