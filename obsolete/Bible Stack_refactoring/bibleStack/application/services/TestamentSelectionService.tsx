import type { TestamentSelectionServicePort } from "bibleStack.application.ports.testaments";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";
import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";

export class TestamentSelectionService implements TestamentSelectionServicePort {
  selectTestament(_params: {
    data: StackTestamentData;
    pacing?: StackPresenceNavigationPacing;
    source: PieceSelectionSource;
  }): Promise<void> {
    return Promise.resolve();
  }

  deselectTestament(_data: StackTestamentData): void {}
}
