import type { PlaylistPlayerControlsManager } from "ext_discover.interfaces.managers.PlaylistPlayerControlsManager";

export type PlaylistPlayerControlsProps = {
  parentId?: string;
  inheritedBar?: boolean;
  scope?: string;
  manager?: PlaylistPlayerControlsManager;
};
