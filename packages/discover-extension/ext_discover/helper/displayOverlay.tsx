import { OverlayRef } from "ext_discover.components.OverlayRef";
import { getOverlayRefManager } from "ext_discover.managers.OverlayRefManager";
import type { DisplayOverlayOptions } from "ext_discover.interfaces.helper.displayOverlay";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function displayOverlay(opts: DisplayOverlayOptions) {
  const manager = getOverlayRefManager();
  const name = manager.appName;

  manager.init({
    items: opts.items,
    removeID: opts.removeID,
    playListId: opts.playListId,
    linkingMode: opts.linkingMode,
  });

  os.unregisterApp(name);
  os.registerApp(name, getPlaylistBot());
  os.compileApp(name, <OverlayRef manager={manager} />);
}
