import type { Signal } from "@preact/signals";

export interface PlayingPlaylistPlayerState {
  currentPlaylistName: string;
  currentItemID: string;
  typeContent: string;
  nextItemName: string;
  prevItemName: string;
  currentItemName: string;
}

export interface PlayingPlaylistManager {
  parentId: string;
  currentFormat: string | undefined;
  renderTick: Signal<number>;
  renderPlaylistTick: Signal<number>;
  isPlaybarInherited: Signal<boolean>;
  showSettingsOptions: Signal<boolean>;
  openAttachLink: Signal<boolean>;
  hide: Signal<boolean>;
  queue: Signal<any[]>;
  itemVisitedMap: Signal<Record<string, boolean>>;
  heading: Signal<string>;
  activeDate: Signal<any>;
  queueDeleteConfirm: Signal<number>;
  playerState: Signal<PlayingPlaylistPlayerState>;
  showMorePosition: { current: Record<string, any> };
  refs: Signal<Record<string, any>>;
  isMobile: Signal<boolean>;
  mount: () => () => void;
  syncSession: (session: {
    parentId: string;
    currentFormat?: string;
    playlistName?: string;
  }) => void;
  toggleHide: () => void;
  setShowSettingsOptions: (value: boolean) => void;
  setOpenAttachLink: (value: boolean) => void;
  setQueueDeleteConfirm: (value: number) => void;
  setIsPlaybarInherited: (value: boolean) => void;
  onClick: (params: any) => void;
  editDataFromPlaylist: (ids: any, key: string, play: boolean) => void;
  onDeleteFromQueue: (
    key: string,
    index: number,
    pId: string,
    id: string
  ) => void;
  onDeleteWholeQueue: (key: number) => void;
  gotoCreate: (id?: string) => void;
  attachLink: (title: string, link: string, linkState: any) => void;
  massAdd: (items: any) => void;
  togglePlaybarInherited: () => Promise<void>;
}
