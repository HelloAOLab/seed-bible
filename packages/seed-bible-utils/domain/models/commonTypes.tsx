export type HexWithHash = `#${string}`;

export type HexString = HexWithHash | string;

export type Span = { from: number; to: number };

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export type WeightedColor = { color: HexString; value?: number };

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
