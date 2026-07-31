import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackChapterData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";

export interface BaseSelectionParams {
  pacing?: StackUpdatePacing;
}

export interface DirectSelectionParams extends BaseSelectionParams {
  data: StackChapterData;
}

export interface AltSelectionParams extends BaseSelectionParams {
  bookData: StackBookData | StackSectionBookData;
  chapter: number;
}

export type TrySelectChapterParams = DirectSelectionParams | AltSelectionParams;

export interface ChapterSelectionPort {
  deselectChapter(params: DirectSelectionParams): Promise<void>;
  trySelectChapter(params: TrySelectChapterParams): Promise<void>;
}
