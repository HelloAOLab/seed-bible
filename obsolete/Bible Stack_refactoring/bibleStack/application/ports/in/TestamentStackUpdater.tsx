import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";

export interface TestamentStackUpdaterPort {
  prepareTestament(data: StackTestamentData): void;
  finalizeTestament(data: StackTestamentData): Promise<void>;
  update(params: {
    data: StackTestamentData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
