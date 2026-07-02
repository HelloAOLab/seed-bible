import type { ProjectModeManager } from "ext_discover.interfaces.managers.ProjectModeManager";

export interface ProjectModeProps {
  setMode: (mode: string) => void;
  showPlaylistSettings: boolean;
  setShowPlaylistSettings: (value: boolean) => void;
  setTab?: (tab: string) => void;
  onReset?: () => void;
  name?: string;
  manager?: ProjectModeManager;
}

export type { ProjectModeProps as ProjectModeComponentProps };
