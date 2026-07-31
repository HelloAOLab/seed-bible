import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

export interface ExplodedViewServicePort {
  registerExplodedSection(section: StackSectionData): void;
  readonly currentExplodedSection: StackSectionData | undefined;
}
