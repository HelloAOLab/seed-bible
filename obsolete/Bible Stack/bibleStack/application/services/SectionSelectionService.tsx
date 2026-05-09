import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";
import type { SectionSelectionServicePort } from "bibleStack.application.ports.sections";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export class SectionSelectionService implements SectionSelectionServicePort {
  selectSection(_params: {
    data: StackSectionData;
    source: PieceSelectionSource;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    // TODO: Bring section selection logic here
    return Promise.resolve();
  }
  deselectSection(_data: StackSectionData): void {
    // TODO: Bring section deselection logic here
  }
}
