import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackChapterData } from "../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { Piece } from "../../domain/models/canvas";
import type { PieceDataMap } from "./out/PieceActivity";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { ParentDataIds } from "../../domain/models/canvas";
import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type { BibleDataRepositoryPort } from "./stacks";
import type { HighlightPacing } from "../../domain/models/pieces";
import type {
  LabelTranslucencyMode,
  ShowSequencePacing,
} from "../../domain/models/label";
import type { BibleStackEvents } from "../../domain/models/events";
import type { ActivityNotificationAdapterPort } from "./out/PieceActivity";

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
  getDataById: <K extends keyof StackPieceDataMap>(params: {
    type: K;
    id: StackPieceDataMap[K]["id"];
  }) => StackPieceDataMap[K] | undefined;
}

export type PieceHierarchyPieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getDataById"
>;
export type PieceHighlightPieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
export interface PieceHighlightSequenceStateServicePort {
  isThereAnOngoingSequence(): boolean;
}
type StackPieceUnion = Piece<
  | "StackTestament"
  | "StackSection"
  | "StackSectionBook"
  | "StackBook"
  | "StackChapter"
>;

export interface PieceHighlightAdapterPort {
  interruptSequence(piece: StackPieceUnion): void;
  highlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  rehighlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  unhighlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  increaseIntensity(piece: StackPieceUnion, pacing?: HighlightPacing): void;
  decreaseIntensity(piece: StackPieceUnion): void;
}
export interface PieceUnhighlightSchedulerAdapterPort {
  schedule(delay: number, callback: () => Promise<void>): string;
  clear(id: string): void;
}
export type PieceHighlightActivityNotificationAdapterPort = Pick<
  ActivityNotificationAdapterPort,
  "hideNotification"
>;
export interface PieceHighlightActivityServicePort {
  updateNotification(container: StackChapterData): void;
}
export interface PieceHighlightLabelServicePort {
  showLabel(params: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    translucencyMode: LabelTranslucencyMode;
  }): Promise<void>;
  hideLabel(
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >,
    pacing?: HighlightPacing
  ): Promise<void>;
  changeIntensity(
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >,
    translucencyMode: LabelTranslucencyMode,
    pacing?: HighlightPacing
  ): Promise<void>;
}

export interface PieceHighlightEventPort {
  emit: <K extends "OnScripturePieceHighlighted">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}
export type PieceHierarchyStackDataRepositoryPort = Pick<
  BibleDataRepositoryPort,
  "getBibleDataById"
>;

export interface PieceHierarchyServicePort {
  getParentDataChain: (parentDataIds: StackParentDataIds) => ParentDataChain;
}

export const HighlightDelays = {
  UserFocusUnhighlightDelay: "UserFocusUnhighlightDelay",
  TransitionUnhighlightDelay: "TransitionUnhighlightDelay",
} as const;

export type HighlightDelay =
  (typeof HighlightDelays)[keyof typeof HighlightDelays];

export interface HighlightConfigProviderPort {
  getDelay: (delay: HighlightDelay) => number;
}

export interface PieceLabelServicePort {
  hideLabel(piece: Piece, pacing?: ShowSequencePacing): Promise<void>;
}
