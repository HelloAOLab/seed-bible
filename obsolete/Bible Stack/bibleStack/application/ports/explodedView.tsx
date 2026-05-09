import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionData";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";

export interface ExplodedViewServicePort {
  explodeSection: (params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }) => void;
  implodeSection: (params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }) => void;
}
