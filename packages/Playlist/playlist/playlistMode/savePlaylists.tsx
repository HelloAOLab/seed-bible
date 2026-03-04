const authBot = await os.requestAuthBotInBackground();
const G = globalThis;
let playlistsToSave = [...that.playlists];

const isCurrAuth = !!authBot?.id;
if ((!G.WAS_PREV_AUTH || that?.force) && isCurrAuth && !!G.Playlist) {
  G.Playlist.getBookmarks();
  const playlistRes = await G.Playlist.getPlaylists({
    initialList: playlistsToSave,
  });
  if (playlistRes?.length) {
    playlistsToSave = [...playlistRes];
  }
  const playlistBot = getBot("system", "playlist.playlistMode");
  playlistBot.fetchAnnotationsData({ ...G.CurrentBookData });
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
  G[`defaultSetPlaylists`]?.([]);
  setTag(thisBot, "defaultplaylistList", []);
  G.setPlaylistLocale([], true);
  setTag(thisBot, "bookmarks", {});
  // throw new Error("User not logged in!");
}
