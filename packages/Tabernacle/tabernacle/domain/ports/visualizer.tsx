import type { PieceVisibilityState } from "../models/piece";
import type { PieceKey, VerseReference } from "../models/piece";

export interface TabernacleVisualizerPort {
  initialize(): void;
  applyMeshState(key: PieceKey, state: PieceVisibilityState): void;
  highlightPiece(key: PieceKey): void;
  stopHighlight(): void;
  toggleContextMenu(
    key: PieceKey,
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
  hideContextMenu(): void;
}
