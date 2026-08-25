import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { PieceSelectionSource } from "../../../domain/models/canvas";
import type { StackUpdatePacing } from "../../../domain/models/stacks";

export interface TestamentSelectionPort {
  select: (params: {
    data: StackTestamentData;
    pacing?: StackUpdatePacing;
    source: PieceSelectionSource;
  }) => Promise<void>;
  deselect: (data: StackTestamentData) => Promise<void>;
}
