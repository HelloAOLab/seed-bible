import type { Signal } from "@preact/signals";
import type { OverlayPosition } from "ext_discover.models.playlist";

export interface PlaylistShellManager {
  showAddToPlaylist: Signal<boolean>;
  createOptions: Signal<boolean>;
  showPlaylistPosition: Signal<OverlayPosition>;
  stopPlaylistModal: Signal<boolean>;
  tab: Signal<string>;
  hide: Signal<boolean>;
  queueOpen: Signal<boolean>;
  openModal: Signal<boolean>;
  sidebarOpen: Signal<boolean>;
  openExternalLink: Signal<string | null>;
  splitAppPanel2: Signal<unknown>;
  setShowAddToPlaylist: (value: boolean) => void;
  setCreateOptions: (value: boolean) => void;
  setStopPlaylistModal: (value: boolean) => void;
  setTab: (value: string) => void;
  setHide: (value: boolean) => void;
  setQueueOpen: (value: boolean) => void;
  setOpenModal: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
  setOpenExternalLink: (value: string | null) => void;
  setSplitAppPanel2: (value: unknown) => void;
  closeConfirmStopPlaylist: () => void;
  gotoCreate: (isAnnotation?: boolean) => void;
  closePlaylist: () => void;
  mountShell: (thisBot: Record<string, unknown>) => () => void;
}
