import type { MeshState } from "./meshState";
import type { PieceKey } from "./piece";

export interface ChapterVisibilityMap {
  [chapter: string]: MeshState;
}

export interface PieceChapterConfig {
  key: PieceKey;
  chaptersInfo: ChapterVisibilityMap;
}

// String keys because JSON object keys are always strings; values may include
// non-piece keys like "tabernacle" so we use string[] instead of PieceKey[].
export type ScriptureVersesMap = Record<
  string,
  Record<string, Record<string, string[]>>
>;
