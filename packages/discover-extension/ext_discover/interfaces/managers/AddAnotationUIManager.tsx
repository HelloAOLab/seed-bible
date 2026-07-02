import type { ReadonlySignal, Signal } from "@preact/signals";
import type { AddAnotationUIProps } from "ext_discover.interfaces.components.AddAnotationUI";

export interface AddAnotationUIManager {
  id: string;
  mediaURL: Signal<string>;
  videoSrc: Signal<any>;
  currentItem: Signal<any>;
  loseProgresss: Signal<boolean>;
  singleMode: Signal<boolean>;
  embedItems: Signal<any[]>;
  tags: Signal<string[]>;
  textHTML: Signal<string | null>;
  isEditAddress: Signal<any>;
  editDataDetails: Signal<any>;
  showPreview: Signal<boolean>;
  selectedAnnotation: Signal<string | null>;
  showMoreOptions: Signal<boolean>;
  publishAccess: Signal<string>;
  loading: Signal<boolean>;
  dataFetching: Signal<boolean>;
  checkListData: Signal<Record<string, boolean>>;
  checkListEmbeded: Signal<Record<string, any>>;
  embedding: Signal<string | boolean | null>;
  checklistEnabled: Signal<boolean>;
  dragOverSet: Signal<{ position: string; itemId: any; pId: any }>;
  draggedItemID: Signal<string | null>;
  draggedParent: Signal<string | null>;
  list: ReadonlySignal<any[]>;
  editData: ReadonlySignal<any>;
  showPlaylistSettings: ReadonlySignal<boolean>;
  finalHistoryObject: ReadonlySignal<any[]>;
  isSomethingChecked: ReadonlySignal<boolean>;
  isSomethingEmbededChecked: ReadonlySignal<boolean>;
  checkEnabled: ReadonlySignal<boolean | string | null>;
  loseProgressAction: { current: (() => void) | null };
  showMorePosition: { current: any };
  showPlaylistPosition: { current: any };
  setShowPlaylistSettings: (value: boolean) => void;
  setMode: (value: string) => void;
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
  setTab: (tab: string) => void;
  setLoseProgresss: (value: boolean) => void;
  setShowMoreOptions: (value: boolean) => void;
  setPublishAccess: (value: string) => void;
  setIsEditAddress: (value: any) => void;
  setTextHTML: (value: string | null) => void;
  setShowPreview: (value: boolean) => void;
  setSelectedAnnotation: (
    value: string | null | ((prev: string | null) => string | null)
  ) => void;
  setEmbedding: (value: string | boolean | null) => void;
  setChecklistData: (value: Record<string, boolean>) => void;
  setChecklistEmbeded: (value: Record<string, any>) => void;
  onBulkDeleteItems: () => void;
  onDisembed: (ids: any, isDelete?: boolean) => void;
  onEmbedInside: () => void;
  editDataFromPlaylist: (receivedIds: any) => void;
  onCheckEmbeded: (id: any, pId: string) => void;
  deleteFromList: (id: string, pid?: string) => void;
  deleteAttachment: (index: number, pID: string, id: string) => void;
  onRemoveTag: (indexofTag: number, idOfParent?: string) => void;
  handleDragStart: (index: number, pId: string | null) => void;
  handleDragOver: (
    index: number,
    pseudoIndex: number | null,
    pseudoID: string | null,
    event: any
  ) => void;
  handleDragEnd: () => void;
  onClickSave: () => Promise<void>;
  syncProps: (props: AddAnotationUIProps) => void;
  mount: () => void;
}
