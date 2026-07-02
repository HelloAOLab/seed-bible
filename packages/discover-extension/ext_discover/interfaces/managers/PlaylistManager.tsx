import type { ReadonlySignal, Signal } from "@preact/signals";
import type { DiscoverChipSelection } from "ext_discover.models.discover";
import type { OverlayPosition } from "ext_discover.models.playlist";

export interface PlaylistManagerDeps {
  creatingPlaylist: Signal<boolean>;
  setCreatingPlaylistParent: (value: boolean) => void;
  thisBot?: Record<string, unknown>;
}

export interface PlaylistManager {
  id: string;
  query: Signal<string>;
  selectedChip: Signal<DiscoverChipSelection>;
  isLayers: Signal<boolean | undefined>;
  isCreate: Signal<boolean | undefined>;
  mediaURL: Signal<string>;
  videoSrc: Signal<boolean | string>;
  currentItem: Signal<Record<string, unknown>>;
  selectedAI: Signal<string>;
  showPlaylistSettings: Signal<boolean>;
  showMoreOptions: Signal<boolean>;
  itemSelected: Signal<string | null>;
  hasGenrated: Signal<boolean>;
  selectedTags: Signal<string[]>;
  selectPlaylist: Signal<boolean>;
  checkListData: Signal<Record<string, boolean>>;
  checkListEmbeded: Signal<Record<string, { idFinal: string; pId: string }>>;
  checklistEnabled: Signal<boolean>;
  embedding: Signal<string | null>;
  layers: Signal<boolean | undefined>;
  searchText: Signal<string>;
  regenrateUI: Signal<boolean>;
  layersWarning: Signal<boolean>;
  dataWarning: Signal<boolean>;
  loseProgressWarning: Signal<boolean>;
  openAttachLink: Signal<boolean>;
  attachment: Signal<unknown>;
  openModal: Signal<boolean>;
  mergeMode: Signal<boolean>;
  renderAgain: Signal<number>;
  checklist: Signal<boolean>;
  readingPlan: Signal<boolean>;
  currentFormat: Signal<string>;
  currentPromptText: Signal<string>;
  systemPrompt: Signal<string>;
  openModalName: Signal<boolean>;
  renamingPlaylist: Signal<boolean>;
  autoGenerateOn: Signal<boolean>;
  genDetails: Signal<string>;
  loading: Signal<boolean>;
  name: Signal<string>;
  link: Signal<string>;
  publishAccess: Signal<string>;
  customColor: Signal<string>;
  selectedColor: Signal<string>;
  selectedIcon: Signal<string | null>;
  description: Signal<string>;
  customIcon: Signal<string | null>;
  playLists: Signal<any[]>;
  selectedPlaylist: Signal<Record<string, boolean | string>>;
  playList: Signal<any[]>;
  hasOldList: Signal<boolean>;
  isSomethingChecked: ReadonlySignal<boolean>;
  isSomethingEmbededChecked: ReadonlySignal<boolean>;
  sharedFilterPlaylists: ReadonlySignal<any[]>;
  filteredPlaylist: ReadonlySignal<any[]>;
  showMorePosition: Signal<OverlayPosition>;
  showPlaylistPosition: Signal<OverlayPosition>;
  playlistListUiElement: Signal<HTMLDivElement | null>;
  editId: { current: string | false };
  onSave: (
    attachment: unknown,
    checklist: boolean,
    readingPlan: boolean,
    currentFormat: string,
    color: string,
    icon: string | null,
    isCustomColor: boolean,
    description: string,
    isCustomIcon: boolean,
    selectedTags: string[],
    layers: boolean | undefined,
    access?: string
  ) => void;
  onClose: () => void;
  syncProps: (props: {
    query: string;
    selectedChip: DiscoverChipSelection;
    isLayers?: boolean;
    isCreate?: boolean;
  }) => void;
  setPlaylistListUiElement: (el: HTMLDivElement | null) => void;
  toggleOpenModalName: (val: boolean) => void;
  toggleSelectedPlaylist: (playlistId: string, parentID: string) => void;
  setEditModal: (props: Record<string, unknown>) => void;
  addDataToPlaylist: (
    data: any,
    isBulk?: boolean,
    combineLast?: boolean,
    setDirect?: boolean
  ) => void;
  editPlaylistData: (
    idRec: string,
    newValueContent: Record<string, unknown>,
    parentId?: string | null,
    fullData?: boolean,
    isQuotedText?: boolean
  ) => void;
  resetPlayist: () => void;
  addPlaylist: (data: any, id?: string | false, subId?: string | null) => void;
  deleteDataFromPlaylist: (
    index: number | number[],
    pId?: string | null
  ) => void;
  deleteDateData: () => void;
  setCreatingPlaylist: (value: boolean, list?: any[]) => void;
  onSearchHit: () => Promise<void>;
  checkNameDuplicate: (newName: string) => boolean;
  attachLink: (
    title: string,
    link: string,
    linkState: Record<string, unknown>
  ) => void;
  massAdd: (items: any[]) => void;
  attachDate: (date?: string) => void;
  onBulkDelete: () => void;
  onBulkJsonDownload: () => void;
  onBulkAddToCollection: () => void;
  onRegenration: () => Promise<void>;
  onRevert: () => void;
  editDataFromPlaylist: (receivedIds: string | string[]) => void;
  onBulkDeleteItems: () => void;
  onEmbedItems: () => void;
  onDisembed: (ids: any, isDelete?: boolean) => void;
  onCheckEmbeded: (id: string | string[], pId: string) => void;
  onClickSave: () => void;
  setPlaylist: (value: any[] | ((prev: any[]) => any[])) => void;
  setPlayLists: (value: any[] | ((prev: any[]) => any[])) => void;
  setTags: (value: string[] | ((prev: string[]) => string[])) => void;
  setName: (value: string) => void;
  setLink: (value: string) => void;
  setLoading: (value: boolean) => void;
  setOpenModalName: (value: boolean) => void;
  setRenamingPlaylist: (value: boolean) => void;
  setCustomIcon: (value: string | null) => void;
  setCustomColor: (value: string) => void;
  setSelectedColor: (value: string) => void;
  setSelectedIcon: (value: string | null) => void;
  setDescription: (value: string) => void;
  setPublishAccess: (value: string) => void;
  setItemSelected: (value: string | null) => void;
  setChecklistData: (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  setChecklistEmbeded: (
    value:
      | Record<string, { idFinal: string; pId: string }>
      | ((
          prev: Record<string, { idFinal: string; pId: string }>
        ) => Record<string, { idFinal: string; pId: string }>)
  ) => void;
  setEmbedding: (value: string | null | false) => void;
  setRegenrateUI: (value: boolean) => void;
  setGenDetails: (value: string) => void;
  setSystemPrompt: (value: string) => void;
  setCurrentPromptText: (value: string) => void;
  setSelectedAI: (value: string) => void;
  setAutoGenerateOn: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowPlaylistSettings: (value: boolean) => void;
  setShowMoreOptions: (value: boolean) => void;
  setDataWarning: (value: boolean) => void;
  setLoseProgressWarning: (value: boolean) => void;
  setLayersWarning: (value: boolean) => void;
  setOpenModal: (value: boolean) => void;
  setMergeMode: (value: boolean) => void;
  setOpenAttachLink: (value: boolean) => void;
  setChecklist: (value: boolean | ((prev: boolean) => boolean)) => void;
  setAttachment: (value: unknown) => void;
  setMediaURL: (value: string) => void;
  setVideoSrc: (value: boolean | string) => void;
  setCurrentItem: (value: Record<string, unknown>) => void;
  generatePlaylistFromAI: () => Promise<void>;
  openCreateFlow: () => void;
}
