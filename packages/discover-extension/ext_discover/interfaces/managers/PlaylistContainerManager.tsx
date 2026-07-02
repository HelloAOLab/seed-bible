import type { Signal } from "@preact/signals";

export interface PlaylistContainerManager {
  creatingPlaylist: Signal<boolean>;
  setCreatingPlaylist: (value: boolean) => void;
}
