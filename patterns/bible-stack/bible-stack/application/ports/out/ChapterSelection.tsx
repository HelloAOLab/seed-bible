import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";

export interface ChapterSelectionParams {
  data: StackChapterData;
  pacing?: StackUpdatePacing;
}

export interface ChapterSelectionPort {
  select(params: ChapterSelectionParams): Promise<void>;
  deselect(params: ChapterSelectionParams): Promise<void>;
}
