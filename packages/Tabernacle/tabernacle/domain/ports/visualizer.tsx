import type { MeshState } from "../models/meshState";
import type { PieceKey, VerseReference } from "../models/piece";

export interface TabernacleVisualizerPort {
  initialize(): void;
  applyMeshState(key: PieceKey, state: MeshState): void;
  highlightPiece(key: PieceKey): void;
  stopHighlight(): void;
  toggleContextMenu(
    key: PieceKey,
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void;
  hideContextMenu(): void;
}
