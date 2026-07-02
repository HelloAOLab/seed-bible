import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackAncestorType } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export interface StackUpdateServicePort {
  updateAllStacks(pacing: StackUpdatePacing): Promise<void>;
  updateStack(
    id: string,
    type: StackAncestorType,
    pacing: StackUpdatePacing
  ): Promise<void>;
}
