import { createPlaylistShellManager } from "ext_discover.managers.PlaylistShellManager";
import { createPlaylistEditManager } from "ext_discover.managers.PlaylistEditManager";
import { createAnnotationManager } from "ext_discover.managers.AnnotationManager";
import { createPlaylistGroupsManager } from "ext_discover.managers.PlaylistGroupsManager";
import type { PlaylistAppManager } from "ext_discover.interfaces.managers.PlaylistAppManager";

export function createPlaylistManagers(): Omit<
  PlaylistAppManager,
  "thisBot" | "isReady"
> {
  const shell = createPlaylistShellManager();
  const edit = createPlaylistEditManager();
  const annotation = createAnnotationManager(shell.tab);
  const groups = createPlaylistGroupsManager(
    shell.setSplitAppPanel2,
    shell.setOpenModal
  );

  return { shell, edit, annotation, groups };
}
