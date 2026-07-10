import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface UpdateCommand {
  data: StackSectionData;
  pacing: StackUpdatePacing;
}

export interface SectionStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
