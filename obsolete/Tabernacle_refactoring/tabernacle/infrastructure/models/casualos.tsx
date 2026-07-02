import type { TypedBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { PieceKey } from "../../domain/models/piece";
import type { Piece } from "../../domain/models/piece";

export interface PieceBotTags<K extends PieceKey = PieceKey> {
  key: K;
  system?: string;
  formOpacity?: number;
  baseFormOpacity?: number;
  pointableDefault?: boolean;
  showHighlightCone?: boolean;
  coneOffset?: { x?: number; y?: number; z?: number };
  scale?: number;
  scaleZ?: number;
}

export type PieceBot<K extends PieceKey = PieceKey> = TypedBot<PieceBotTags<K>>;

export interface HitboxBotTags {
  anchorPoint: string;
  draggable: boolean;
  color: string;
  pointable: boolean;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  form?: string;
  transformer: string;
  pieceId: Piece["id"];
  pieceKey: PieceKey;
}

export type HitboxBot = TypedBot<HitboxBotTags>;
