import type { ReadonlySignal, Signal } from "@preact/signals";
import type { AnnotationManager } from "ext_discover.interfaces.managers.AnnotationManager";
import type { PlaylistEditManager } from "ext_discover.interfaces.managers.PlaylistEditManager";
import type { PlaylistGroupsManager } from "ext_discover.interfaces.managers.PlaylistGroupsManager";
import type { PlaylistShellManager } from "ext_discover.interfaces.managers.PlaylistShellManager";

export interface PlaylistAppManager {
  shell: PlaylistShellManager;
  edit: PlaylistEditManager;
  annotation: AnnotationManager;
  groups: PlaylistGroupsManager;
  /** @deprecated Remove when shell mount no longer needs playlist.playlistMode bot */
  thisBot: ReadonlySignal<unknown>;
  isReady: Signal<boolean>;
}
