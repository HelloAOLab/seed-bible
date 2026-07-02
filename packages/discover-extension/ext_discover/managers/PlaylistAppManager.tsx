import { computed, signal } from "@preact/signals";
import { createPlaylistManagers } from "ext_discover.managers.createPlaylistManagers";
import type { PlaylistAppManager } from "ext_discover.interfaces.managers.PlaylistAppManager";

let playlistAppManagerSingleton: PlaylistAppManager | undefined;

export function getPlaylistAppManager(): PlaylistAppManager {
  if (!playlistAppManagerSingleton) {
    playlistAppManagerSingleton = createPlaylistAppManager();
  }
  return playlistAppManagerSingleton;
}

export function createPlaylistAppManager(): PlaylistAppManager {
  const managers = createPlaylistManagers();
  const thisBot = signal<unknown>(null);
  const isReady = computed(() => true);

  return {
    ...managers,
    thisBot,
    isReady,
  };
}
