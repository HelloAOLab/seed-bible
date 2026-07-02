import type { Signal } from "@preact/signals";

export interface OnAddDateModalManager {
  date: Signal<string>;
  init: (opts: { onAttach: (date: string) => void }) => void;
  setDate: (value: string) => void;
  save: () => void;
  close: () => void;
}
