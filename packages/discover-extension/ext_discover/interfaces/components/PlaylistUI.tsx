import type { AnnotationManager } from "ext_discover.interfaces.managers.AnnotationManager";
import type { PlaylistEditManager } from "ext_discover.interfaces.managers.PlaylistEditManager";
import type { PlaylistGroupsManager } from "ext_discover.interfaces.managers.PlaylistGroupsManager";
import type { PlaylistShellManager } from "ext_discover.interfaces.managers.PlaylistShellManager";

export interface PlaylistUIProps {
  shell: PlaylistShellManager;
  edit: PlaylistEditManager;
  annotation: AnnotationManager;
  groups: PlaylistGroupsManager;
  thisBot: {
    tags: Record<string, string>;
    StopPlayingPlaylist: () => void;
    CloseFloatingApp: () => void;
    CloseSelf: (opts?: { force?: boolean }) => void;
    resetPlaylistGlobalStateVars: () => void;
    resetEditingState: (opts: { id: string | null }) => void;
  };
}
