import type { Hitbox, HitboxData } from "../../../domain/models/hitbox";
import type { Piece } from "../../../domain/models/piece";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface PiecesProviderPort {
  getPieces<E extends ExperienceKey>(
    experience: E
  ): Piece<ExperienceKeyMap[E]>[];
}

export interface HitboxProviderPort {
  getHitboxData<E extends ExperienceKey>(
    experienceKey: E,
    pieceKey: ExperienceKeyMap[E]
  ): HitboxData | null;
  getAnchorPoint(): string;
  isDraggable(): boolean;
  getColor(): string;
  isPointable(): boolean;
}

export interface HitboxSpawnerPort {
  spawn(params: { data: HitboxData; piece: Piece }): Hitbox;
}

export interface DimensionProvider {
  getDimension(): string;
}
