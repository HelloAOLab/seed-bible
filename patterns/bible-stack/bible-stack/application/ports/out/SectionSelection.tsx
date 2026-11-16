import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface SectionSelectionPort {
  select(data: StackSectionData, pacing?: StackUpdatePacing): Promise<void>;
  deselect(data: StackSectionData): Promise<void>;
}
