export type HexWithHash = `#${string}`;

export type HexString = HexWithHash | string;

export type Span = { from: number; to: number };

export type RGB = [number, number, number];

export type WeightedColor = { color: HexString; value?: number };
