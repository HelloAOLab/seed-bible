import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface ExplodedViewServicePort {
  explodeSection(params: {
    data: StackSectionData;
    pacing?: StackUpdatePacing;
  }): Promise<void>;
  registerExplodedSection(section: StackSectionData): void;
  readonly currentExplodedSection: StackSectionData | undefined;
}
