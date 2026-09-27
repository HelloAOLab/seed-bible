import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";

export interface UpdateCommand {
  data: StackBookData | StackSectionBookData;
  pacing: StackUpdatePacing;
}

export interface BookStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
