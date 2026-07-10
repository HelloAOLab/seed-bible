import type { TestamentSelectionServicePort } from "../ports/testaments";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type { PieceSelectionSource } from "../../domain/models/canvas";

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
