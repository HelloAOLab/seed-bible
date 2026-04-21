import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";
import type { BookSelectionServicePort } from "bibleStack.application.ports.books";

export class BookSelectionService implements BookSelectionServicePort {
  selectBook: (
    data: StackBookData | StackSectionBookData,
    source: PieceSelectionSource
  ) => void = (data, source) => {
    // TODO: Bring book selection logic here
  };
  deselectBook: (data: StackBookData | StackSectionBookData) => void = (
    data
  ) => {
    // TODO: Bring book deselection logic here
  };
}
