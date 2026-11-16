import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";

export interface BibleStackUpdaterServicePort {
  update(params: {
    data: StackBibleData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
