import type { PieceDataRepositoryPort as BasePieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { PieceLabelServicePort as BasePieceLabelServicePort } from "bibleVizUtils.domain.ports.label";
import type { StackLabelableBiblePiece } from "bibleStack.domain.models.pieceLifecycle";
import type {
  BookBot,
  ChapterBot,
  SectionBot,
  TestamentBot,
} from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { BibleStackEvents } from "bibleStack.domain.models.events";
import type {
  SectionPathIndices,
  TestamentPathIndices,
} from "bibleVizUtils.application.services.ArrangementService";
import type {
  BookInfo,
  SectionInfo,
  TestamentInfo,
} from "bibleVizUtils.domain.models.arrangement";

export type PieceDataRepositoryPort = Pick<
  BasePieceDataRepositoryPort,
  | "removeTestamentData"
  | "removeSectionData"
  | "removeSectionBookData"
  | "removeBookData"
  | "removeChapterData"
>;

export type PieceLabelServicePort = Pick<
  BasePieceLabelServicePort<StackLabelableBiblePiece>,
  "hideLabel" | "showLabel"
>;

export interface StackPieceLifecycleAdapter {
  spawnTestament: () => TestamentBot;
  despawnTestament: (piece: Piece<"StackTestament">) => void;
  spawnSection: () => SectionBot;
  despawnSection: (piece: Piece<"StackSection">) => void;
  spawnBook: () => BookBot;
  despawnBook: (piece: Piece<"StackBook">) => void;
  spawnChapter: () => ChapterBot;
  despawnChapter: (piece: Piece<"StackChapter">) => void;
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
  getSectionByIndices(path: SectionPathIndices): SectionInfo | undefined;
}

export interface ScriptureServicePort {
  getSectionChapterCount: (section: readonly BookInfo[]) => number;
}

export interface IdGeneratorPort {
  getId: () => string;
}
