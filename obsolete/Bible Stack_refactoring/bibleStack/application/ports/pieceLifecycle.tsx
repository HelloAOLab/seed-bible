import type { PieceDataRepositoryPort as BasePieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { PieceLabelServicePort as BasePieceLabelServicePort } from "bibleVizUtils.domain.ports.label";
import type { StackLabelableBiblePiece } from "bibleStack.domain.models.pieceLifecycle";
import type {
  BookBot,
  ChapterBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { BibleStackEvents } from "bibleStack.domain.models.events";
import type {
  BookPathIndices,
  SectionPathIndices,
  TestamentPathIndices,
} from "bibleVizUtils.application.services.ArrangementService";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type { VersesBundleData } from "bibleVizUtils.domain.entities.VersesBunbleData";

export type PieceDataRepositoryPort = Pick<
  BasePieceDataRepositoryPort,
  | "removeTestamentData"
  | "removeSectionData"
  | "removeSectionBookData"
  | "removeBookData"
  | "removeChapterData"
  | "addChapterData"
  | "addBookData"
  | "addSectionBookData"
  | "addSectionData"
  | "addTestamentData"
>;

export type PieceLabelServicePort = Pick<
  BasePieceLabelServicePort<StackLabelableBiblePiece>,
  "hideLabel" | "showLabel"
>;

export interface StackPieceLifecycleAdapterPort {
  spawnTestament: () => TestamentBot;
  despawnTestament: (piece: Piece<"StackTestament">) => void;
  spawnSection: () => SectionBot;
  despawnSection: (piece: Piece<"StackSection">) => void;
  spawnBook: () => BookBot;
  despawnBook: (piece: Piece<"StackBook">) => void;
  spawnChapter: () => ChapterBot;
  despawnChapter: (piece: Piece<"StackChapter">) => void;
  spawnSectionShadow: () => SectionShadowBot;
  spawnSectionShadowDomain: () => Piece<"StackSectionShadow">;
  despawnSectionShadow: (piece: Piece<"StackSectionShadow">) => void;
  despawnSectionBook: (piece: Piece<"StackSectionBook">) => void;
  spawnVersesBundle: () => VersesBundleBot;
  despawnVersesBundle: (piece: Piece<"VersesBundle">) => void;
  spawnVerse: () => VerseBot;
  despawnVerse: (piece: Piece<"Verse">) => void;
  despawn: (piece: Piece) => void;
}

export interface PieceLifecycleEventPort {
  emit: <K extends "OnTestamentDelete">(
    eventName: K,
    ...args: BibleStackEvents[K] extends undefined | void
      ? [payload?: BibleStackEvents[K]]
      : [payload: BibleStackEvents[K]]
  ) => void;
}

export interface ArrangementServicePort {
  getTestamentByIndices: (
    path: TestamentPathIndices
  ) => TestamentInfo | undefined;
  getSectionByIndices: (path: SectionPathIndices) => SectionInfo | undefined;
  getBookByIndices: (path: BookPathIndices) => BookInfo | undefined;
}

export interface ScriptureServicePort {
  getSectionChapterCount: (section: readonly BookInfo[]) => number;
}

export interface IdGeneratorPort {
  getId: () => string;
}

export interface StackStructureServicePort {
  getSectionLevels: (books: readonly BookInfo[]) => BookInfo[][];
}

export interface VersesBundleDataRepositoryPort {
  addBundleData(data: VersesBundleData): void;
  removeBundleData(data: VersesBundleData): void;
}
