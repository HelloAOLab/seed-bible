import type { Signal } from "@preact/signals";

export interface PlaylistPlayerControlsProps {
  parentId?: string;
  inheritedBar?: boolean;
  scope?: string;
}

export interface PlaylistQueueInfo {
  currentPlaylistName: string;
  currentItemID: string;
  typeContent: string;
  nextItemName: any;
  prevItemName: any;
  currentItemName: any;
  currentItem: any;
}

export interface PlaylistPlayerControlsManager {
  parentId: string;
  inheritedBar: Signal<boolean>;
  showCurrent: Signal<boolean>;
  queue: Signal<any[]>;
  openExternalLink: Signal<string | null>;
  transformedHistory: Signal<any[]>;
  oldData: Signal<any[]>;
  openAttachLink: Signal<boolean>;
  checkedItems: Signal<Record<string, boolean>>;
  currIndex: Signal<Record<string, any>>;
  playlists: Signal<Record<string, any>>;
  mediaURL: Signal<string | null>;
  fileName: Signal<string | null>;
  videoSrc: Signal<any>;
  textInfo: Signal<string>;
  activeIndexs: Signal<Record<string, boolean>>;
  queueInfo: Signal<PlaylistQueueInfo>;
  progress: Signal<{ safeCurrent: number; safeTotal: number; percent: number }>;
  isMobile: Signal<boolean>;
  isMobileSmall: Signal<boolean>;
  isItemLink: Signal<boolean>;
  mount: () => () => void;
  syncProps: (props: PlaylistPlayerControlsProps) => void;
  handleOnButtonPress: (
    order?: number,
    getIndexOnly?: boolean,
    directSet?: number | false,
    directSetKey?: number | false,
    newIndexs?: Record<string, any>
  ) => any;
  handlesetIndex: (index?: number, key?: number | string) => void;
  addToQueue: (item: any, combineLast: boolean) => void;
  attachLink: (title: string, link: string, linkState: any) => void;
  massAdd: (items: any) => void;
  setOpenAttachLink: (value: boolean) => void;
  setOpenExternalLink: (value: string | null) => void;
  stopPlaylist: () => void;
  goNext: () => void;
  goPrev: () => void;
}
