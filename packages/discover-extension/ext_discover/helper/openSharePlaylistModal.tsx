import { SharePlaylistModal } from "ext_discover.components.SharePlaylistModal";
import { getSharePlaylistModalManager } from "ext_discover.managers.SharePlaylistModalManager";
import type { OpenSharePlaylistModalOptions } from "ext_discover.interfaces.helper.openSharePlaylistModal";

const G = globalThis as Record<string, any>;

const APP_NAME = "share-playlist-modal";

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export async function openSharePlaylistModal(
  that: OpenSharePlaylistModalOptions = {}
) {
  const playlistSharerName = that.playlistSharerName;
  if (!playlistSharerName) return null;

  if (G.hasASharedPlaylist) {
    const authBot = await os.requestAuthBotInBackground();
    const playlistBot = getPlaylistBot();
    if (authBot?.id && playlistBot.tags?.keyFetchAccountData) {
      await os.getData(playlistBot.tags.keyFetchAccountData, authBot.id);
    }
    G.shareProfileName = false;
  }

  const playlistShared = (G[`${"default"}playlists`] || []).find(
    (ele: any) => ele.id === G.hasASharedPlaylist
  );

  const manager = getSharePlaylistModalManager();
  manager.init({
    playlistSharerName,
    playlistShared: playlistShared ?? null,
    shareProfilePic: G.shareProfilePic,
  });

  os.unregisterApp(APP_NAME);
  os.registerApp(APP_NAME, getPlaylistBot());
  os.compileApp(APP_NAME, <SharePlaylistModal manager={manager} />);
}
