import { createContext, useContext } from "preact/compat";
import type { ComponentChildren } from "preact";
import type { PlaylistEditContextType } from "ext_discover.interfaces.contexts.PlaylistEditContext";
import { createPlaylistEditManager } from "ext_discover.managers.PlaylistEditManager";

const PlaylistEditContext = createContext<PlaylistEditContextType | undefined>(
  undefined
);

let editManagerSingleton: PlaylistEditContextType | undefined;

export function getPlaylistEditManager(): PlaylistEditContextType {
  if (!editManagerSingleton) {
    editManagerSingleton = createPlaylistEditManager();
  }
  return editManagerSingleton;
}

export function PlaylistEditProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const manager = getPlaylistEditManager();

  return (
    <PlaylistEditContext.Provider value={manager}>
      {children}
    </PlaylistEditContext.Provider>
  );
}

export function usePlaylistEditContext(): PlaylistEditContextType {
  const ctx = useContext(PlaylistEditContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistEditContext must be used within PlaylistEditProvider"
    );
  }
  return ctx;
}
