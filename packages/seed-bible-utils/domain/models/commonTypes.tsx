/**
 * The colour types moved to the core package alongside the colour functions
 * that define them (see `../functions/colors`). The geometry and translation
 * types are not core's business and stay here.
 */
export type {
  HexWithHash,
  HexString,
  RGB,
  RGBA,
  WeightedColor,
} from "@packages/seed-bible/seed-bible/managers/Colors";

export type Span = { from: number; to: number };

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Translatable {
  translationKey?: string;
}
