import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";

export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
}

export interface PieceAdapterPort {
  isPieceAnchored: (piece: Piece) => boolean;
}

export type ScripturePieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

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
