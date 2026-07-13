import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { PieceSelectionSource } from "../../../domain/models/canvas";
import type { StackPresenceNavigationPacing } from "../../../domain/models/userPresence";

export interface SectionSelectionServicePort {
  select: (params: {
    data: StackSectionData;
    source: PieceSelectionSource;
    pacing?: StackPresenceNavigationPacing;
  }) => Promise<void>;
  deselect: (data: StackSectionData) => void;
}
