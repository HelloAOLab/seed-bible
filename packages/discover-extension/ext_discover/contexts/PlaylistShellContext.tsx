import { createContext, useContext } from "preact/compat";
import type { ComponentChildren } from "preact";
import type { PlaylistShellContextType } from "ext_discover.interfaces.contexts.PlaylistShellContext";
import { createPlaylistShellManager } from "ext_discover.managers.PlaylistShellManager";

const PlaylistShellContext = createContext<
  PlaylistShellContextType | undefined
>(undefined);

let shellManagerSingleton: PlaylistShellContextType | undefined;

export function getPlaylistShellManager(): PlaylistShellContextType {
  if (!shellManagerSingleton) {
    shellManagerSingleton = createPlaylistShellManager();
  }
  return shellManagerSingleton;
}

export function PlaylistShellProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const manager = getPlaylistShellManager();

  return (
    <PlaylistShellContext.Provider value={manager}>
      {children}
    </PlaylistShellContext.Provider>
  );
}

export function usePlaylistShellContext(): PlaylistShellContextType {
  const ctx = useContext(PlaylistShellContext);
  if (!ctx) {
    throw new Error(
      "usePlaylistShellContext must be used within PlaylistShellProvider"
    );
  }
  return ctx;
}
