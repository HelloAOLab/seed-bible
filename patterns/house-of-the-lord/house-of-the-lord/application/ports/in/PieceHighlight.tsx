import type { TabernaclePieceKey } from "../../../domain/models/piece";

export interface PieceHighlightPort {
  highlight(key: TabernaclePieceKey): void;
  stopHighlight(): void;
}
