import type { AttachmentLinkItemManager } from "ext_discover.interfaces.managers.AttachmentLinkItemManager";

export interface AttachmentLinkItemProps {
  clickPass?: boolean;
  activeItemID?: string | false;
  playlistId?: string | false;
  setRef?: Record<string, { current: HTMLInputElement | null }>;
  oldItemsMap?: Record<string, boolean>;
  dragOverSet?: { itemId?: string; position?: string };
  playlistName?: string | false;
  linkingMode?: boolean;
  viewOnly?: boolean;
  checklistEnabled?: boolean;
  checkListData?: Record<string, boolean>;
  data: any;
  editDataFromPlaylist?: (id: string | string[], checked?: boolean) => void;
  creatingPlaylist?: boolean;
  toggle?: string | false;
  onClickItem?: (args: { dataItem: any }) => void;
  handleDragStart?: (index: number, pId: string) => void;
  handleDragOver?: (
    index: number,
    originalIndex: number,
    nullArg: null,
    e: any
  ) => void;
  handleDragEnd?: () => void;
  deleteFromList?: (index: number, pId: string, id: string) => void;
  originalIndex?: number;
  index?: number;
  playListSubIndex?: number | false;
  onClick?: (args: { dataItem: any; index: number }) => void;
  setList?: (updater: (prev: any[]) => any[]) => void;
  activeItemList?: Record<string, boolean>;
  currentDateActive?: string | false;
  originalList?: any[];
  datesRepeat?: Record<string, boolean>;
  datesInWrongOrder?: Record<string, boolean>;
  currentFormat?: string | false;
  isSomethingEmbededChecked?: boolean;
  draggable?: boolean;
  layers?: boolean;
  onDisembed?: () => void;
  playingPlaylist?: boolean;
  justPlay?: boolean;
  embedding?: boolean;
  pId?: string;
  onClickCheckbox?: () => void;
  checked?: boolean;
  isPlaylistNestedSupported?: boolean;
  isPlaylistNestedPlayAble?: boolean;
  autoPlayToggle?: (originalIndex: number, pId: string, id: string) => void;
  isDeleteShow?: boolean;
  scope?: string;
  manager?: AttachmentLinkItemManager;
}
