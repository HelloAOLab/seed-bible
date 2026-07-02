import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { PieceSelectionSource } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

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
