import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";

export interface PrepareBookCommand {
  data: StackBookData;
  sectionData?: StackSectionData | undefined;
}

export interface PrepareSectionBookCommand {
  data: StackSectionBookData;
}

export type PrepareCommand = PrepareBookCommand | PrepareSectionBookCommand;

export interface BookStackUpdaterPort {
  prepareBook(command: PrepareCommand): void;
  finalizeBook(data: StackSectionBookData | StackBookData): Promise<void>;
  update(params: {
    data: StackSectionBookData | StackBookData;
    pacing: StackUpdatePacing;
  }): Promise<void>;
}
