export type HexWithHash = `#${string}`;

export type HexString = HexWithHash | string;

export type Span = { from: number; to: number };
