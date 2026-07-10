import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";

export interface ExplodedViewServicePort {
  explodeSection: (params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }) => Promise<void>;
  implodeSection: (params: {
    data: StackSectionData;
    pacing?: StackPresenceNavigationPacing;
  }) => Promise<void>;
}
