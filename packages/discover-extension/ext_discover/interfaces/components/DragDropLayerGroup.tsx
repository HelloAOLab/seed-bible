import type { DragDropWithGroupingManager } from "ext_discover.interfaces.managers.DragDropWithGroupingManager";
import type { DragDropLayerGroupManager } from "ext_discover.interfaces.managers.DragDropLayerGroupManager";
import type { DragOverSet } from "ext_discover.models.playlistList";
import type { PlaylistDateIssues } from "ext_discover.hooks.computePlaylistDateIssues";

export interface DragDropLayerGroupProps {
  manager?: DragDropLayerGroupManager;
  dragManager: DragDropWithGroupingManager;
  setItemSelected: (value: any) => void;
  datesRepeat: PlaylistDateIssues["datesRepeat"];
  itemSelected: any;
  attachLink: (...args: any[]) => void;
  massAdd: (...args: any[]) => void;
  datesInWrongOrder: PlaylistDateIssues["datesInWrongOrder"];
  currentFormat?: string | false;
  draggedItemID: string | null;
  readingPlanEnabled?: boolean;
  currentDateActive?: unknown;
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
  transformedHistory: any[];
  playListSubIndex?: number | null;
  isSomethingEmbededChecked?: boolean;
  checkListEmbeded?: Record<string, boolean>;
  setChecklistEmbeded?: (
    id: string | string[],
    parentId?: string,
    value?: boolean
  ) => void;
  onDisembed?: (args: { id: string; pId: string }) => void;
  setRef?: Record<string, { current: HTMLInputElement | null }>;
  layers?: boolean;
  embedding?: boolean | string;
  setEmbedding?: (value: string | false) => void;
  originalIndex: number;
  clickPass?: boolean;
  activeItemID?: string | false;
  activeItemList?: Record<string, boolean>;
  oldItemsMap?: Record<string, boolean>;
  playListSubId?: string | null;
  data: any;
  viewOnly?: boolean;
  linkingMode?: boolean;
  creatingPlaylist?: boolean;
  checkListData?: Record<string, boolean>;
  checklistEnabled?: boolean;
  playlistName?: string | false;
  editDataFromPlaylist?: (id: string | string[], checked?: boolean) => void;
  type: string;
  toggle?: string | false;
  playingPlaylist?: boolean;
  greyOut?: boolean;
  content: string;
  id: string;
  additionalInfo: any;
  index: number;
  onClickItem?: (args: { dataItem: any; bulkAdd?: boolean }) => void;
  onClick?: (args: {
    dataItem: any;
    bulkAdd?: boolean;
    index?: number;
    justPlay?: boolean;
  }) => void;
  deleteFromList: (index: number | string[], pId?: string) => void;
  dragOverSet: DragOverSet;
  isAdditionalInfo?: boolean;
  isDeleteShow?: boolean;
}
