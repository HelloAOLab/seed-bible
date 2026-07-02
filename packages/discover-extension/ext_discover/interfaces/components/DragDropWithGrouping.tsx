import type { DragDropWithGroupingManager } from "ext_discover.interfaces.managers.DragDropWithGroupingManager";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";

export interface DragDropWithGroupingProps {
  manager?: DragDropWithGroupingManager;
  scope?: string;
  massAdd?: (...args: any[]) => void;
  attachLink?: (...args: any[]) => void;
  onGenClick?: () => void;
  setItemSelected?: (value: any) => void;
  itemSelected?: any;
  access?: string;
  isSomethingEmbededChecked?: boolean;
  checkListEmbeded?: Record<string, boolean>;
  setChecklistEmbeded?: (
    id: string | string[],
    parentId?: string,
    value?: boolean
  ) => void;
  onDisembed?: (args: { id: string; pId: string }) => void;
  layers?: boolean;
  embedding?: boolean | string;
  setEmbedding?: (value: string | false) => void;
  setRef?: Record<string, { current: HTMLInputElement | null }>;
  allowHeadingCheck?: boolean;
  selectedTags?: unknown;
  playlistName?: string | false;
  currentDateActive?: unknown;
  clickPass?: boolean;
  currentFormat?: string | false;
  readingPlanEnabled?: boolean;
  linkingMode?: boolean;
  viewOnly?: boolean;
  checkListData?: Record<string, boolean>;
  oldItemsMap?: Record<string, boolean>;
  parentId?: string;
  list: any[];
  isPlayer?: boolean;
  playingPlaylist?: PlayingPlaylistId;
  activeItemList?: Record<string, boolean>;
  activeItemID?: string | false;
  toggleRemoved?: unknown;
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
  editDataFromPlaylist?: (id: string | string[], checked?: boolean) => void;
  playListSubId?: string | null;
  setPlaylistFromRow?: (value: any[] | ((prev: any[]) => any[])) => void;
  playListSubIndex?: number | null;
  deleteFromList?: (index: number | string[], pId?: string) => void;
  onClickItem?: (args: { dataItem: any; bulkAdd?: boolean }) => void;
  onClick?: (args: {
    dataItem: any;
    bulkAdd?: boolean;
    index?: number;
    justPlay?: boolean;
  }) => void;
  creatingPlaylist?: boolean;
  color?: string;
  icon?: string;
  isCustomColor?: boolean;
  description?: string;
  isCustomIcon?: boolean;
  onSelectPlaylist?: ((id: string) => void) | null;
  isDeleteShow?: boolean;
  onLinking?: unknown;
}
