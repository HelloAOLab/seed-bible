import type { Signal } from "@preact/signals";

export interface MergeModalManager {
  selected: Signal<string>;
  sourceId: Signal<string>;
  parentId: Signal<string>;
  filteredPlaylists: Signal<Record<string, any>[]>;
  init: (opts: { id: string; parentId?: string }) => void;
  close: () => void;
  merge: () => void;
}
