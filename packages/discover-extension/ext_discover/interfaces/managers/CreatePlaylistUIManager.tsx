import type { ReadonlySignal, Signal } from "@preact/signals";
import type { PlaylistManager } from "ext_discover.interfaces.managers.PlaylistManager";
import type { CreatePlaylistUIProps } from "ext_discover.interfaces.components.CreatePlaylistUI";

export interface CreatePlaylistUIManagerInit extends Pick<
  CreatePlaylistUIProps,
  "setTab" | "editData" | "isCreate" | "isLayers"
> {}

export interface CreatePlaylistUIManager {
  id: string;
  playlist: PlaylistManager;
  uiCreatingPlaylist: Signal<boolean>;
  mode: Signal<string>;
  setMode: (value: string) => void;
  isTempEdit: { current: boolean };
  editData: Signal<CreatePlaylistUIProps["editData"]>;
  onCreateTabSave: () => void;
  discardCreateProgress: () => void;
  syncInit: (init: CreatePlaylistUIManagerInit) => void;
  editorVisible: ReadonlySignal<boolean>;
}
