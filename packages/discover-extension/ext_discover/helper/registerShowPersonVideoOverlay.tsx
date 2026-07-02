import { ShowPersonVideoOverlay } from "ext_discover.components.ShowPersonVideoOverlay";
import { getShowPersonVideoOverlayManager } from "ext_discover.managers.ShowPersonVideoOverlayManager";

const G = globalThis as Record<string, any>;

const APP_NAME = "person-video-overlay";

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function openShowPersonVideoOverlay() {
  const manager = getShowPersonVideoOverlayManager();
  manager.open();

  os.unregisterApp(APP_NAME);
  os.registerApp(APP_NAME, getPlaylistBot());
  os.compileApp(APP_NAME, <ShowPersonVideoOverlay manager={manager} />);
}

export function closeShowPersonVideoOverlay() {
  const manager = getShowPersonVideoOverlayManager();
  manager.close();
  os.unregisterApp(APP_NAME);
}

export function registerShowPersonVideoOverlayGlobals() {
  G.OpenVideoOverlay = openShowPersonVideoOverlay;
  G.CloseVideoOverlay = closeShowPersonVideoOverlay;
}
