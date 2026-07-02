import { PlaylistLinkModal } from "ext_discover.components.PlaylistLinkModal";
import { getPlaylistLinkModalManager } from "ext_discover.managers.PlaylistLinkModalManager";
import type { PlaylistLinkModalOptions } from "ext_discover.interfaces.helper.openPlaylistLinkModal";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function openPlaylistLinkModal(opts: PlaylistLinkModalOptions = {}) {
  const manager = getPlaylistLinkModalManager();
  manager.init(opts);

  os.unregisterApp("playlist-link-modal");
  os.registerApp("playlist-link-modal", getPlaylistBot());
  os.compileApp("playlist-link-modal", <PlaylistLinkModal manager={manager} />);
}
