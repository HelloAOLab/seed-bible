import type { Signal } from "@preact/signals";
import type {
  PlayingPlaylistId,
  PlaylistGroups,
} from "ext_discover.models.playlist";

export interface PlaylistGroupsManager {
  playingPlaylist: Signal<PlayingPlaylistId>;
  playlists: Signal<PlaylistGroups>;
  activePlaylistIds: Signal<string[]>;
  setPlayingPlaylist: (value: PlayingPlaylistId) => void;
  setPlaylists: (
    value: PlaylistGroups | ((prev: PlaylistGroups) => PlaylistGroups)
  ) => void;
  onAddPlaylist: () => void;
}
