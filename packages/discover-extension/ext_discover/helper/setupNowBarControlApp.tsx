import { PlaylistPlayerControls } from "ext_discover.components.PlaylistPlayerControls";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import type { SetupNowBarControlAppOptions } from "ext_discover.interfaces.helper.setupNowBarControlApp";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export async function setupNowBarControlApp(
  opts: SetupNowBarControlAppOptions = {}
) {
  const parentId = opts.parentId || opts.parentID || "default";
  const force = opts.force || false;
  const nowBarId = "player-playlist-bar";
  const isMobileSmall = isMobilePlaylistViewport();

  if (G.AddNowBarApp && (!G.IsQueuePresent || force)) {
    G.AddNowBarApp(
      <PlaylistPlayerControls parentId={parentId} />,
      nowBarId,
      isMobileSmall
    );
    G.NowBarFullWidth = true;
    setTimeout(() => {
      G.SetIsFullWidth(true);
      G.NowBarFullWidth = false;
    }, 100);
  } else if (!G.IsQueuePresent) {
    os.unregisterApp("playing-playlist-flaot");
    os.registerApp("playing-playlist-flaot", getPlaylistBot());
    const FloatApp = () => {
      return (
        <div
          style={{
            top: "1rem",
            left: "1rem",
            zIndex: "10000",
            position: "fixed",
          }}
        >
          <PlaylistPlayerControls parentId="default" />
        </div>
      );
    };
    os.compileApp("playing-playlist-flaot", <FloatApp />);
  }
}
