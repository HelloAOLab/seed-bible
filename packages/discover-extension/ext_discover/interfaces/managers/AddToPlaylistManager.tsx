import type { ReadonlySignal, Signal } from "@preact/signals";

export interface AddToPlaylistManager {
  playLists: Signal<any[]>;
  filteredPlaylist: ReadonlySignal<any[]>;
  onSelectPlaylist: (playlistId: string, onClose: () => void) => void;
  onAddNewPlaylist: (onClose: () => void) => void;
  setPlayLists: (value: any[] | ((prev: any[]) => any[])) => void;
  mount: () => void;
  unmount: () => void;
}
