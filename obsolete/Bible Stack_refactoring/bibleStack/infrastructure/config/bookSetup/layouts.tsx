import type { BookLayout } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

type TupleOf<
  T,
  N extends number,
  R extends unknown[] = [],
> = R["length"] extends N ? R : TupleOf<T, N, [T, ...R]>;

export type LayoutConfigurations = 2 | 3 | 4 | 5 | 6;

type LayoutMap = {
  [K in LayoutConfigurations]: TupleOf<BookLayout, K>;
};

export const LAYOUTS: LayoutMap = {
  2: [
    { x: { from: 0.5, to: 1 }, y: { from: 0, to: 1 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0, to: 1 } },
  ],
  3: [
    { x: { from: 0, to: 1 }, y: { from: 0.75, to: 1 } },
    { x: { from: 0.5, to: 1 }, y: { from: 0, to: 0.75 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0, to: 0.75 } },
  ],
  4: [
    { x: { from: 0.5, to: 1 }, y: { from: 0.5, to: 1 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0.5, to: 1 } },
    { x: { from: 0.5, to: 1 }, y: { from: 0, to: 0.5 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0, to: 0.5 } },
  ],
  5: [
    { x: { from: 0, to: 0.5 }, y: { from: 0, to: 0.4 } },
    { x: { from: 0.5, to: 1 }, y: { from: 0, to: 0.4 } },
    { x: { from: 0.66, to: 1 }, y: { from: 0.4, to: 1 } },
    { x: { from: 0.33, to: 0.66 }, y: { from: 0.4, to: 1 } },
    { x: { from: 0, to: 0.33 }, y: { from: 0.4, to: 1 } },
  ],
  6: [
    { x: { from: 0.5, to: 1 }, y: { from: 0.66, to: 1 } },
    { x: { from: 0.5, to: 1 }, y: { from: 0.33, to: 0.66 } },
    { x: { from: 0.5, to: 1 }, y: { from: 0, to: 0.33 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0.66, to: 1 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0.33, to: 0.66 } },
    { x: { from: 0, to: 0.5 }, y: { from: 0, to: 0.33 } },
  ],
};
