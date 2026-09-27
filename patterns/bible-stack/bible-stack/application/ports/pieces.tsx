import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackChapterData } from "../../domain/entities/StackChapterData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { Piece, PieceDataMap } from "../../domain/models/canvas";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { BibleDataRepositoryPort } from "./stacks";
import type { HighlightPacing } from "../../domain/models/pieces";
import type { ActivityNotificationAdapterPort } from "./out/PieceActivity";

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
  getPieceData: <K extends keyof PieceDataMap>(
    piece: Piece<K>
  ) => PieceDataMap[K] | undefined;
  getAllPiecesDataByType: <K extends keyof PieceDataMap>(
    type: K
  ) => PieceDataMap[K][];
  getDataById: <K extends keyof PieceDataMap>(params: {
    type: K;
    id: PieceDataMap[K]["id"];
  }) => PieceDataMap[K] | undefined;
}

export type PieceHierarchyPieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getDataById"
>;
export type PieceHighlightPieceDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;
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
export type PieceHierarchyStackDataRepositoryPort = Pick<
  BibleDataRepositoryPort,
  "getBibleDataById"
>;

export const HighlightDelays = {
  UserFocusUnhighlightDelay: "UserFocusUnhighlightDelay",
  TransitionUnhighlightDelay: "TransitionUnhighlightDelay",
} as const;

export type HighlightDelay =
  (typeof HighlightDelays)[keyof typeof HighlightDelays];

export interface HighlightConfigProviderPort {
  getDelay: (delay: HighlightDelay) => number;
}
