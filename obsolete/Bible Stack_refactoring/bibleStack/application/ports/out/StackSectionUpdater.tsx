import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

export interface UpdateCommand {
  data: StackSectionData;
  pacing: StackUpdatePacing;
}

export interface SectionStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
