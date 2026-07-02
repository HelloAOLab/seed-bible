import { signal, effect, computed } from "@preact/signals";
import type { PlaylistGroupsManager } from "ext_discover.interfaces.managers.PlaylistGroupsManager";
import type {
  PlayingPlaylistId,
  PlaylistGroups,
} from "ext_discover.models.playlist";
import { getActivePlaylistIds } from "ext_discover.hooks.getActivePlaylistIds";

const G = globalThis as Record<string, any>;

const defaultPlaylists = (): PlaylistGroups => ({
  default: {
    active: true,
    deleteable: false,
    link: "",
  },
});

export function createPlaylistGroupsManager(
  setSplitAppPanel2: (value: unknown) => void,
  setOpenModal: (value: boolean) => void
): PlaylistGroupsManager {
  const playingPlaylist = signal<PlayingPlaylistId>(false);
  const playlists = signal<PlaylistGroups>(
    G.PlaylistsGroups || defaultPlaylists()
  );

  const activePlaylistIds = computed(() =>
    getActivePlaylistIds(playlists.value, playingPlaylist.value)
  );

  const setPlayingPlaylist = (value: PlayingPlaylistId) => {
    playingPlaylist.value = value;
    if (!value) {
      setSplitAppPanel2(value);
    }
  };

  const setPlaylists = (
    value: PlaylistGroups | ((prev: PlaylistGroups) => PlaylistGroups)
  ) => {
    playlists.value =
      typeof value === "function" ? value(playlists.value) : value;
  };

  const onAddPlaylist = () => {
    setPlaylists((prev) => {
      const id = G.createUUID();
      return {
        ...prev,
        [id]: {
          active: true,
          deleteable: true,
          link: "",
        },
      };
    });
    setOpenModal(false);
  };

  effect(() => {
    G.PlayingPlaylist = playingPlaylist.value;
    G.PlaylistsGroups = playlists.value;
    G.SetPlayingPlaylist = setPlayingPlaylist;
    G.SetPlaylistGroups = setPlaylists;
    setPlaylistsLocale(playlists.value);
  });

  return {
    playingPlaylist,
    playlists,
    activePlaylistIds,
    setPlayingPlaylist,
    setPlaylists,
    onAddPlaylist,
  };
}
