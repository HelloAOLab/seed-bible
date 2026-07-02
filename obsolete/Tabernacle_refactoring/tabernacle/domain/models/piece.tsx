export type PieceKey =
  | "altar-of-sacrifice"
  | "ark-of-covenant"
  | "bars"
  | "bronze-laver"
  | "brown-curtain"
  | "front-curtain"
  | "front-pillars"
  | "grey-curtain"
  | "incense-altar"
  | "inner-curtain"
  | "inner-pillars"
  | "menorah"
  | "purple-curtain"
  | "red-curtain"
  | "rings"
  | "table-of-showbread"
  | "walls"
  | "ground"
  | "fence";

export const PIECE_KEYS: PieceKey[] = [
  "altar-of-sacrifice",
  "ark-of-covenant",
  "bars",
  "bronze-laver",
  "brown-curtain",
  "front-curtain",
  "front-pillars",
  "grey-curtain",
  "incense-altar",
  "inner-curtain",
  "inner-pillars",
  "menorah",
  "purple-curtain",
  "red-curtain",
  "rings",
  "table-of-showbread",
  "walls",
  "ground",
  "fence",
];

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

export type PieceVisibilityState = "Hidden" | "Shown" | "Translucent";

export const PieceVisibilityStates: {
  [K in PieceVisibilityState]: K;
} = {
  Hidden: "Hidden",
  Shown: "Shown",
  Translucent: "Translucent",
} as const;
