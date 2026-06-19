import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";

export interface StackUpdateServicePort {
  updateAllStacks(pacing: StackUpdatePacing): Promise<void>;
}
