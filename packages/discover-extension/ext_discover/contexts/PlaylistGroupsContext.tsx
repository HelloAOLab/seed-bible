import { createContext, useContext } from "preact/compat";
import type { ComponentChildren } from "preact";
import type { PlaylistGroupsContextType } from "ext_discover.interfaces.contexts.PlaylistGroupsContext";
import { createPlaylistGroupsManager } from "ext_discover.managers.PlaylistGroupsManager";
import { getPlaylistShellManager } from "ext_discover.contexts.PlaylistShellContext";

const PlaylistGroupsContext = createContext<
  PlaylistGroupsContextType | undefined
>(undefined);

let groupsManagerSingleton: PlaylistGroupsContextType | undefined;

export function getPlaylistGroupsManager(): PlaylistGroupsContextType {
  if (!groupsManagerSingleton) {
    const shell = getPlaylistShellManager();
    groupsManagerSingleton = createPlaylistGroupsManager(
      shell.setSplitAppPanel2,
      shell.setOpenModal
    );
  }
  return groupsManagerSingleton;
}

export function PlaylistGroupsProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const manager = getPlaylistGroupsManager();

  return (
    <PlaylistGroupsContext.Provider value={manager}>
      {children}
    </PlaylistGroupsContext.Provider>
  );
}

export function usePlaylistGroupsContext(): PlaylistGroupsContextType {
  const ctx = useContext(PlaylistGroupsContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistGroupsContext must be used within PlaylistGroupsProvider"
    );
  }
  return ctx;
}
