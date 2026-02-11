const authBot = await os.requestAuthBotInBackground();

let playlistsToSave = [...that.playlists];

const isCurrAuth = !!authBot?.id;

if (!globalThis.WAS_PREV_AUTH && isCurrAuth) {
  thisBot.getBookmarks();
  const playlistRes = await thisBot.getPlaylists({
    initialList: playlistsToSave,
  });
  if (playlistRes?.length) {
    playlistsToSave = [...playlistRes];
  }
  thisBot.fetchAnnotationsData({...globalThis.CurrentBookData});
  globalThis.SetAuthSwtich?.((p) => !p);
}

globalThis.WAS_PREV_AUTH = !!authBot?.id;
if (authBot?.id) {
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
  throw new Error(t('userNotLoggedIn'));
}
