import { effect, signal } from "@preact/signals";
import type { PlaylistContainerManager } from "ext_discover.interfaces.managers.PlaylistContainerManager";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, PlaylistContainerManager>();

export function getPlaylistContainerManager(
  id: string
): PlaylistContainerManager {
  const existing = managersById.get(id);
  if (existing) return existing;

  const manager = createPlaylistContainerManager(id);
  managersById.set(id, manager);
  return manager;
}

export function createPlaylistContainerManager(
  id: string
): PlaylistContainerManager {
  const creatingPlaylist = signal(!!G[`${id}creatingPlaylist`]);

  const setCreatingPlaylist = (value: boolean) => {
    creatingPlaylist.value = value;
    G[`${id}creatingPlaylist`] = value;
  };

  effect(() => {
    G[`${id}creatingPlaylist`] = creatingPlaylist.value;
  });

  return {
    creatingPlaylist,
    setCreatingPlaylist,
  };
}
