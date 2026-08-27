// TABERNACLE_PIECE_KEYS duplicated in packages/house-of-the-lord/pieceKeys.ts — separate runtimes, keep in sync.
export const TABERNACLE_PIECE_KEYS = {
  ALTAR_OF_SACRIFICE: "altar-of-sacrifice",
  ARK_OF_COVENANT: "ark-of-covenant",
  BARS: "bars",
  BRONZE_LAVER: "bronze-laver",
  BROWN_CURTAIN: "brown-curtain",
  FRONT_CURTAIN: "front-curtain",
  FRONT_PILLARS: "front-pillars",
  GREY_CURTAIN: "grey-curtain",
  INCENSE_ALTAR: "incense-altar",
  INNER_CURTAIN: "inner-curtain",
  INNER_PILLARS: "inner-pillars",
  MENORAH: "menorah",
  PURPLE_CURTAIN: "purple-curtain",
  RED_CURTAIN: "red-curtain",
  RINGS: "rings",
  TABLE_OF_SHOWBREAD: "table-of-showbread",
  WALLS: "walls",
  GROUND: "ground",
  FENCE: "fence",
} as const;

export type TabernaclePieceKey =
  (typeof TABERNACLE_PIECE_KEYS)[keyof typeof TABERNACLE_PIECE_KEYS];

export type PieceKey = TabernaclePieceKey;

export interface KeyStateEntry {
  key: PieceKey;
  state: PieceVisibilityState;
}

export interface VerseReference {
  bookId: string;
  chapter: number;
  verse: number;
}

export interface Piece<K extends PieceKey = PieceKey> {
  key: K;
  id: string;
}

export const PIECE_VISIBILITY_STATES = {
  HIDDEN: "hidden",
  SHOWN: "shown",
  TRANSLUCENT: "translucent",
} as const;

export type PieceVisibilityState =
  (typeof PIECE_VISIBILITY_STATES)[keyof typeof PIECE_VISIBILITY_STATES];
