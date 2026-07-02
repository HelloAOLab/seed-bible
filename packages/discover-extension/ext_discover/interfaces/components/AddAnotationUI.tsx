import type { AddAnotationUIManager } from "ext_discover.interfaces.managers.AddAnotationUIManager";

export interface AddAnotationUIProps {
  list: any[];
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
  setMode: (value: string) => void;
  showPlaylistSettings: boolean;
  setShowPlaylistSettings: (value: boolean) => void;
  id: string;
  onReset?: () => void;
  editData?: any;
  setTab?: (tab: string) => void;
  annoation?: boolean;
  name?: string;
  manager?: AddAnotationUIManager;
}
