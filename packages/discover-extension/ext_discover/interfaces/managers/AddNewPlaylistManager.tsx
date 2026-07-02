import type { ReadonlySignal, Signal } from "@preact/signals";

export interface AddNewPlaylistManager {
  showMoreOptions: Signal<boolean>;
  activeTab: Signal<string>;
  tagName: Signal<string>;
  uploadedFileData: Signal<any[]>;
  importTab: Signal<string>;
  isChecked: Signal<boolean>;
  predefinedIcons: Signal<string[]>;
  informationModal: Signal<boolean>;
  tabsVals: ReadonlySignal<string[]>;
  importTabsVal: ReadonlySignal<string[]>;
  isActiveSheetImport: ReadonlySignal<boolean>;
  setShowMoreOptions: (value: boolean | ((prev: boolean) => boolean)) => void;
  setActiveTab: (tab: string) => void;
  setTagName: (value: string) => void;
  setUploadedFileData: (value: any[]) => void;
  setImportTab: (tab: string) => void;
  setIsChecked: (value: boolean) => void;
  setPredefinedIcons: (
    value: string[] | ((prev: string[]) => string[])
  ) => void;
  setInformationModal: (value: boolean) => void;
  handleTabChange: (tab: string) => void;
  handleImportTabChange: (tab: string) => void;
  isButtomDisabled: (name: string | undefined, link: string) => boolean;
  onImport: (ctx: AddNewPlaylistActionContext) => Promise<void>;
  onCreate: (ctx: AddNewPlaylistActionContext) => Promise<void>;
  mount: (id: string) => void;
}

export interface AddNewPlaylistActionContext {
  id: string;
  editId: string | false;
  parentId: string;
  name: string;
  link: string;
  description: string;
  selectedTags: string[];
  selectedColor: string;
  customColor: string;
  selectedIcon: string | null;
  isLayers?: boolean;
  loading: boolean;
  setLoading: (value: boolean) => void;
  setName: (value: string) => void;
  setOpenModalName: (value: boolean) => void;
  checkNameDuplicate: (newName?: string) => boolean;
  onCreatePlaylist: () => void;
  handleSheetUrl: (linkUrl: string) => Promise<unknown>;
}
