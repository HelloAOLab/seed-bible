import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";

export interface UpdateCommand {
  data: StackTestamentData;
  pacing: StackUpdatePacing;
}

export interface TestamentStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
