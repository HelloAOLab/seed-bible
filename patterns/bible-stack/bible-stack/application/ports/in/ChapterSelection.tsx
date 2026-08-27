import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";

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
