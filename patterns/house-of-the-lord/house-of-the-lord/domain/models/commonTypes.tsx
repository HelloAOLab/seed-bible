export type RGB = [number, number, number];

export type Span = { from: number; to: number };

export type WeightedColor = { color: string; value?: number };

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}
