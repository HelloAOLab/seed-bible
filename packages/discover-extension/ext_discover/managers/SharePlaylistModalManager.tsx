import { runPlaylistPlaying } from "ext_discover.helper.runPlaylistPlaying";
import type { SharePlaylistModalManager } from "ext_discover.interfaces.managers.SharePlaylistModalManager";

const G = globalThis as Record<string, any>;

const APP_NAME = "share-playlist-modal";

let singleton: SharePlaylistModalManager | undefined;

export function getSharePlaylistModalManager(): SharePlaylistModalManager {
  if (!singleton) {
    singleton = createSharePlaylistModalManager();
  }
  return singleton;
}

export function createSharePlaylistModalManager(): SharePlaylistModalManager {
  let playlistSharerName = "";
  let playlistShared: Record<string, any> | null = null;
  let shareProfilePic: string | false = false;

  const close = () => {
    os.unregisterApp(APP_NAME);
  };

  const begin = () => {
    if (!playlistShared) return;

    if (G.DragDrop) {
      void runPlaylistPlaying({
        playingPlaylist: playlistShared.id,
        startIndex: 0,
        startSubIndex: -1,
        parentId: "default",
        name: playlistShared.name,
      });
    }

    close();
    G.hasASharedPlaylist = false;
  };

  const init = (opts: {
    playlistSharerName: string;
    playlistShared: Record<string, any> | null;
    shareProfilePic?: string | false;
  }) => {
    playlistSharerName = opts.playlistSharerName;
    playlistShared = opts.playlistShared;
    shareProfilePic = opts.shareProfilePic ?? G.shareProfilePic ?? false;
  };

  return {
    get playlistSharerName() {
      return playlistSharerName;
    },
    get playlistShared() {
      return playlistShared;
    },
    get shareProfilePic() {
      return shareProfilePic;
    },
    init,
    close,
    begin,
  };
}
