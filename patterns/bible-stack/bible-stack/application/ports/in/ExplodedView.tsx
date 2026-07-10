import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface ExplodedViewServicePort {
  registerExplodedSection(section: StackSectionData): void;
  readonly currentExplodedSection: StackSectionData | undefined;
}
