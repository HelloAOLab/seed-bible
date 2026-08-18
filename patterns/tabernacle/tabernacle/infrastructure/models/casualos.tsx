import type { PieceKey } from "../../domain/models/piece";
import type { Piece } from "../../domain/models/piece";
import type {
  BotLinks,
  BotSpace,
  BotVars,
} from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { VFXPieceKey } from "../../domain/models/vfx";

export interface TypedBot<T = BotTags, M = BotTags> {
  id: string;
  link: string;
  space?: BotSpace;
  tags: T;
  masks: M;
  links: BotLinks;
  vars: BotVars;
  raw: T;
  changes: T;
  maskChanges: {
    [space: string]: T;
  };
}

export interface ColorLerpableBotTags {
  color: string;
  labelColor: string;
}

export type ColorLerpablePieceBot = TypedBot<ColorLerpableBotTags>;

export interface PieceBotTags<
  K extends PieceKey = PieceKey,
> extends ColorLerpableBotTags {
  key: K;
  system?: string;
  formOpacity?: number;
  baseFormOpacity?: number;
  pointableDefault?: boolean;
  showHighlightCone?: boolean;
  coneOffset?: { x?: number; y?: number; z?: number };
  scale?: number;
  scaleZ?: number;
  targetPositionZ?: number;
  pointable: boolean;
  formRenderOrder: number;
  formDepthWrite?: boolean;
}

export interface VFXBotTags<
  K extends VFXPieceKey,
> extends ColorLerpableBotTags {
  key: K;
  parentId?: string;
  pointable: false;
  scale?: number;
  scaleZ?: number;
  targetScale?: number;
  space: BotSpace;
  system?: string | null;
  formOpacity?: number;
}

export type PieceBot<K extends PieceKey = PieceKey> = TypedBot<PieceBotTags<K>>;
export type VFXBot<K extends VFXPieceKey = VFXPieceKey> = TypedBot<
  VFXBotTags<K>
>;

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

export interface PieceBotTypeMap {
  "altar-of-sacrifice": PieceBot<"altar-of-sacrifice">;
  "ark-of-covenant": PieceBot<"ark-of-covenant">;
  bars: PieceBot<"bars">;
  "bronze-laver": PieceBot<"bronze-laver">;
  "brown-curtain": PieceBot<"brown-curtain">;
  "front-curtain": PieceBot<"front-curtain">;
  "front-pillars": PieceBot<"front-pillars">;
  "grey-curtain": PieceBot<"grey-curtain">;
  "incense-altar": PieceBot<"incense-altar">;
  "inner-curtain": PieceBot<"inner-curtain">;
  "inner-pillars": PieceBot<"inner-pillars">;
  menorah: PieceBot<"menorah">;
  "purple-curtain": PieceBot<"purple-curtain">;
  "red-curtain": PieceBot<"red-curtain">;
  rings: PieceBot<"rings">;
  "table-of-showbread": PieceBot<"table-of-showbread">;
  walls: PieceBot<"walls">;
  ground: PieceBot<"ground">;
  fence: PieceBot<"fence">;
}
