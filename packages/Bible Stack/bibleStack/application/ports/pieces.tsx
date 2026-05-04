import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceDataMap } from "bibleVizUtils.domain.models.pieceData";
import type { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type { ParentDataIds } from "bibleVizUtils.domain.models.canvas";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";
import type { BibleDataRepositoryPort } from "./stacks";
import type {
  HighlightRequestSource,
  UnhighlightPacing,
  UnhighlightRequestSource,
} from "bibleStack.domain.models.pieces";
import type { LabelTranslucencyMode } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/label";

export type StackParentDataIds = Pick<
  ParentDataIds,
  | "stackBibleId"
  | "stackBookId"
  | "stackSectionBookId"
  | "stackSectionId"
  | "stackTestamentId"
>;

export type AnyStackData =
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData;

export type StackPieceDataMap = Pick<
  PieceDataMap,
  | "StackTestament"
  | "StackSection"
  | "StackSectionBook"
  | "StackBook"
  | "StackChapter"
>;

export interface ParentDataChain {
  bibleData: StackBibleData | undefined;
  testamentData: StackTestamentData | undefined;
  sectionData: StackSectionData | undefined;
  sectionBookData: StackSectionBookData | undefined;
  bookData: StackBookData | undefined;
}

export interface PieceDataRepositoryPort {
  addTestamentData: (data: StackTestamentData) => void;
  removeTestamentData: (data: StackTestamentData) => void;
  clearTestamentsData: () => StackTestamentData[];
  getAllTestaments: () => StackTestamentData[];
  addSectionData: (data: StackSectionData) => void;
  removeSectionData: (data: StackSectionData) => void;
  clearSectionsData: () => StackSectionData[];
  getAllSections: () => StackSectionData[];
  addSectionBookData: (data: StackSectionBookData) => void;
  removeSectionBookData: (data: StackSectionBookData) => void;
  clearSectionBooksData: () => StackSectionBookData[];
  getAllSectionBooks: () => StackSectionBookData[];
  addBookData: (data: StackBookData) => void;
  removeBookData: (data: StackBookData) => void;
  clearBooksData: () => StackBookData[];
  getAllBooks: () => StackBookData[];
  addChapterData: (data: StackChapterData) => void;
  removeChapterData: (data: StackChapterData) => void;
  clearChaptersData: () => StackChapterData[];
  getAllChapters: () => StackChapterData[];
  getPieceData: <K extends keyof StackPieceDataMap>(
    piece: Piece<K>
  ) => StackPieceDataMap[K] | undefined;
  getAllPiecesDataByType: <K extends keyof StackPieceDataMap>(
    type: K
  ) => StackPieceDataMap[K][];
  getDataById: <K extends keyof StackPieceDataMap>(
    type: K,
    id: StackPieceDataMap[K]["id"]
  ) => StackPieceDataMap[K] | undefined;
}

export type PieceHierarchyPieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getDataById"
>;
export type PieceHierarchyStackDataRepositoryPort = Pick<
  BibleDataRepositoryPort,
  "getBibleDataById"
>;

export interface PieceHierarchyServicePort {
  getParentDataChain: (parentDataIds: StackParentDataIds) => ParentDataChain;
}

export interface PieceHighlightServicePort {
  tryHighlightPiece: (params: {
    piece: Piece;
    source: HighlightRequestSource;
    unhighlightDelay?: number;
  }) => Promise<void>;
  tryUnhighlightPiece: (params: {
    piece: Piece;
    source: UnhighlightRequestSource;
    pacing: UnhighlightPacing;
    delay?: number;
  }) => Promise<void>;
  isUnhighlightScheduled: (piece: Piece) => boolean;
  changeHighlightIntensity: ({
    piece,
    intensity,
  }: {
    piece: Piece;
    intensity: LabelTranslucencyMode;
  }) => void; // TODO: Change this to use a particular interface for the intensity. Leave LabelTranslucencyMode to the label only.
}
