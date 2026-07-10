import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";

export interface TestamentStackUpdaterPort {
  prepareTestament(data: StackTestamentData): void;
  finalizeTestament(data: StackTestamentData): Promise<void>;
  update(params: {
    data: StackTestamentData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
