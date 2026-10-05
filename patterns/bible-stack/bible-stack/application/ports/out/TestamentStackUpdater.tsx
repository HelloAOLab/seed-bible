import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";

export interface TestamentStackUpdateCommand {
  data: StackTestamentData;
  pacing: StackUpdatePacing;
}

export interface TestamentStackUpdaterPort {
  update(params: TestamentStackUpdateCommand): Promise<void>;
}
