import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";

export interface UpdateCommand {
  data: StackTestamentData;
  pacing: StackUpdatePacing;
}

export interface TestamentStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
