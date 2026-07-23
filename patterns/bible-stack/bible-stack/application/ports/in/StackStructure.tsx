import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";

export interface StackStructureServicePort {
  pullOutPieceFromParent: (params: {
    pieceData:
      | StackTestamentData
      | StackSectionData
      | StackSectionBookData
      | StackBookData
      | StackChapterData;
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
    sectionBookData: StackSectionBookData | undefined;
    bookData: StackBookData | undefined;
  }) => void;
}
