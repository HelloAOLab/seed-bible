import type {
  BookBot,
  ChapterBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "../../infrastructure/models/stack";
import type { Piece, SectionShadow } from "../../domain/models/canvas";
import type { VersesBundleData } from "../../domain/entities/VersesBundleData";
import type { PieceDataRepositoryPort as BasePieceDataRepositoryPort } from "./out/PieceDataRepository";

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
  spawnSectionShadowDomain: (sectionDataId: string) => SectionShadow;
  despawnSectionShadow: (piece: SectionShadow) => void;
  despawnSectionBook: (piece: Piece<"StackSectionBook">) => void;
  spawnVersesBundle: () => VersesBundleBot;
  despawnVersesBundle: (piece: Piece<"VersesBundle">) => void;
  spawnVerse: () => VerseBot;
  despawnVerse: (piece: Piece<"Verse">) => void;
  despawn: (piece: Piece) => void;
}

export interface IdGeneratorPort {
  getId: () => string;
}

export interface VersesBundleDataRepositoryPort {
  addBundleData(data: VersesBundleData): void;
  removeBundleData(data: VersesBundleData): void;
}
