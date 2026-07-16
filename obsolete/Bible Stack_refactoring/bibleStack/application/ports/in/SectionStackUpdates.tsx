import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

export interface SectionStackUpdaterPort {
  prepareSection(data: StackSectionData): void;
  finalizeSection(data: StackSectionData): Promise<void>;
  update(params: {
    data: StackSectionData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
