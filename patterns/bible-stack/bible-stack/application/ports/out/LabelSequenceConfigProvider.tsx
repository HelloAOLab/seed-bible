import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface LabelSequenceConfigProviderPort {
  getShowSequenceDurationSeconds(pacing: StackUpdatePacing): number;
}
