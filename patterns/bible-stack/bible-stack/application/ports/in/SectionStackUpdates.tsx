import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface SectionStackUpdaterPort {
  prepareSection(data: StackSectionData): void;
  finalizeSection(data: StackSectionData): Promise<void>;
  update(params: {
    data: StackSectionData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
