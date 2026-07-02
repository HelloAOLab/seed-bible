import { fetchAnnotationsData } from "ext_discover.helper.fetchAnnotationsData";
import { getPlaylists } from "ext_discover.helper.getPlaylists";
import { getStorageBot } from "ext_discover.storage.getStorageBot";

export async function savePlaylists(that?: any) {
  const authBot = await os.requestAuthBotInBackground();
  const G = globalThis as any;
  const storageBot = getStorageBot();
  let playlistsToSave = [...that.playlists];

  const isCurrAuth = !!authBot?.id;
  if ((!G.WAS_PREV_AUTH || that?.force) && isCurrAuth && !!G.Playlist) {
    G.Playlist?.getBookmarks?.();
    const playlistRes = await getPlaylists({
      initialList: playlistsToSave,
    });
    if (playlistRes?.length) {
      playlistsToSave = [...playlistRes];
    }
    fetchAnnotationsData({ ...G.CurrentBookData });
    G.SetAuthSwtich?.((p: boolean) => !p);
  }

  G.WAS_PREV_AUTH = !!authBot?.id;
  if (authBot?.id) {
    if (!G.CountIgnoreSave) {
      G.CountIgnoreSave = 0;
    }
    G.CountIgnoreSave++;
    if (playlistsToSave.length === 0 && G.CountIgnoreSave < 2) {
      return;
    }
    const res = await os.recordData(
      authBot.id,
      "playlists",
      { playlists: [...playlistsToSave] },
      {
        marker: "bookmarks",
      }
    );
    return res;
  } else {
    G.SetBookmarks?.({});
    setTag(storageBot, "defaultplaylistList", []);
    const oldPlaylistList = getTag(storageBot, "defaultplaylistList");
    if (oldPlaylistList?.length) {
      G[`defaultSetPlaylists`]?.([]);
      G.setPlaylistLocale?.([], "default", true);
    }
    setTag(storageBot, "bookmarks", {});
    // throw new Error("User not logged in!");
  }
}
