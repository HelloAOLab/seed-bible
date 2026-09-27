import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface TestamentSelectionPort {
  select(data: StackTestamentData, pacing?: StackUpdatePacing): Promise<void>;
}
