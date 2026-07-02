import type { AddNewPlaylistManager } from "ext_discover.interfaces.managers.AddNewPlaylistManager";

export interface AddNewPlaylistProps {
  id: string;
  editId: string | false;
  list: any[];
  parentId: string;
  link: string;
  setLink: (value: string) => void;
  setOpenModalName: (value: boolean) => void;
  checkNameDuplicate: (newName?: string) => boolean;
  onCreatePlaylist: () => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  handleSheetUrl: (linkUrl: string) => Promise<unknown>;
  name: string;
  setName: (value: string) => void;
  customColor: string;
  setCustomColor: (value: string) => void;
  selectedColor: string;
  publishAccess: string;
  setPublishAccess: (value: string) => void;
  setSelectedColor: (value: string) => void;
  selectedIcon: string | null;
  setSelectedIcon: (value: string | null) => void;
  description: string;
  setDescription: (value: string) => void;
  customIcon: string | null;
  setCustomIcon: (value: string | null) => void;
  isTempEdit?: boolean;
  onClickBackToDiscover: () => void;
  selectedTags: string[];
  renameScreen?: boolean;
  setTags: (value: string[] | ((prev: string[]) => string[])) => void;
  isLayers?: boolean;
  manager?: AddNewPlaylistManager;
}
