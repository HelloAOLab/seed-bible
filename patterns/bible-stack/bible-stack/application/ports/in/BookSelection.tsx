import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { PieceSelectionSource } from "../../../domain/models/canvas";

export interface BookSelectionServicePort {
  selectBook: (params: {
    data: StackBookData | StackSectionBookData;
    pacing?: StackUpdatePacing;
    source: PieceSelectionSource;
  }) => Promise<void>;
  deselectBook: (
    data: StackBookData | StackSectionBookData,
    pacing?: StackUpdatePacing
  ) => Promise<void>;
  selectBooks: (
    dataArray: (StackBookData | StackSectionBookData)[],
    pacing?: StackUpdatePacing
  ) => Promise<void>;
  deselectBooks: (
    dataArray: (StackBookData | StackSectionBookData)[],
    pacing?: StackUpdatePacing
  ) => Promise<void>;
}
