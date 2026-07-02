import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";

export interface BibleStackUpdaterPort {
  update(params: {
    data: StackBibleData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
