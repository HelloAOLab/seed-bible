import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";
import type { BookSelectionServicePort } from "bibleStack.application.ports.books";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export class BookSelectionService implements BookSelectionServicePort {
  selectBook: (params: {
    data: StackBookData | StackSectionBookData;
    pacing?: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }) => void = (_params) => {
    // TODO: Bring book selection logic here
  };
  deselectBook: (data: StackBookData | StackSectionBookData) => void = (
    data
  ) => {
    // TODO: Bring book deselection logic here
  };
}
