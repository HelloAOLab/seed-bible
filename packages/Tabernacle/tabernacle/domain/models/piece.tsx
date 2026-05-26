import type { MeshState } from "./meshState";

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

export interface KeyStateEntry {
  key: PieceKey;
  state: MeshState;
}

export interface VerseReference {
  bookId: string;
  chapter: number;
  verse: number;
}
