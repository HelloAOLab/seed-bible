import type { ChapterSelectionServicePort } from "bibleStack.application.ports.chapters";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";

export class ChapterSelectionService implements ChapterSelectionServicePort {
  deselectChapter(
    _data: StackChapterData,
    _setBibleAnimating?: boolean
  ): Promise<void> {
    return Promise.resolve();
  }

  trySelectChapter(_params: {
    data: StackChapterData;
    bookData: StackBookData | StackSectionBookData | undefined;
  }): Promise<void> {
    return Promise.resolve();
  }
}
