import { signal } from "@preact/signals";
import type { MergeModalManager } from "ext_discover.interfaces.managers.MergeModalManager";

const G = globalThis as Record<string, any>;

const APP_NAME = "merge-modal";

let singleton: MergeModalManager | undefined;

export function getMergeModalManager(): MergeModalManager {
  if (!singleton) {
    singleton = createMergeModalManager();
  }
  return singleton;
}

export function createMergeModalManager(): MergeModalManager {
  const selected = signal("");
  const sourceId = signal("");
  const parentId = signal("default");
  const filteredPlaylists = signal<Record<string, any>[]>([]);

  const close = () => {
    os.unregisterApp(APP_NAME);
  };

  const init = (opts: { id: string; parentId?: string }) => {
    const parentIdStr = opts.parentId || "default";
    sourceId.value = opts.id;
    parentId.value = parentIdStr;
    selected.value = "";
    filteredPlaylists.value = (G[`${parentIdStr}playlists`] || []).filter(
      (playlist: any) => playlist.id !== opts.id
    );
  };

  const merge = () => {
    const id = sourceId.value;
    const dragItemIndex = G.playlists.findIndex(
      ({ id: itemID }: any) => itemID === id
    );
    const dragOverItemIndex = G.playlists.findIndex(
      ({ id: itemId }: any) => itemId === selected.value
    );
    G.SetPlaylists &&
      G.SetPlaylists((prev: any) => {
        const old = [...prev];
        const oldItem = old[dragItemIndex];
        old[dragOverItemIndex].list.push({
          type: "playlist",
          ...oldItem,
        });
        old[dragOverItemIndex].nesting += 1;
        old.splice(dragItemIndex, 1);
        return old;
      });
    close();
  };

  return {
    selected,
    sourceId,
    parentId,
    filteredPlaylists,
    init,
    close,
    merge,
  };
}
