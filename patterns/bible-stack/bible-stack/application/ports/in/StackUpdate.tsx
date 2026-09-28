import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackAncestorType } from "../../../domain/models/canvas";

export interface StackUpdateServicePort {
  updateAllStacks(pacing: StackUpdatePacing): Promise<void>;
  updateStack(
    id: string,
    type: StackAncestorType,
    pacing: StackUpdatePacing
  ): Promise<void>;
}
