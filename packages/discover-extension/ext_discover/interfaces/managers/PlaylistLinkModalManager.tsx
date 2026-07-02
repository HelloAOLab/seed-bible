import type { Signal } from "@preact/signals";
import type { PlaylistLinkModalOptions } from "ext_discover.interfaces.helper.openPlaylistLinkModal";

export interface PlaylistLinkModalManager {
  addList: Signal<boolean>;
  name: Signal<string>;
  playbackListID: Signal<string>;
  playlistId: Signal<string>;
  collection: Signal<Record<string, any>[]>;
  initialName: Signal<string>;
  sourceId: Signal<string | undefined>;
  allPlaylistGroups: Signal<Record<string, any>>;
  init: (opts: PlaylistLinkModalOptions) => void;
  cleanup: () => void;
  onCurrentCollectionEdit: (props: Record<string, any>) => void;
  onCloseAddList: () => void;
  saveCollections: () => void;
  close: () => void;
  removeFromCollection: (collId: string) => void;
  addPlaylistToCollection: () => void;
  getPlaybackOptions: () => { label: string; value: string }[];
  getPlaylistOptions: () => { label: string; value: string }[];
}
