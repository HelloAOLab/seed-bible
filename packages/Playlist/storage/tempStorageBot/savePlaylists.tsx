const authBot = await os.requestAuthBotInBackground();

let playlistsToSave = [...that.playlists];

const isCurrAuth = !!authBot?.id;

if (!globalThis.WAS_PREV_AUTH && isCurrAuth && !!globalThis.Playlist) {
  globalThis.Playlist.getBookmarks();
  const playlistRes = await globalThis.Playlist.getPlaylists({
    initialList: playlistsToSave,
  });
  if (playlistRes?.length) {
    playlistsToSave = [...playlistRes];
  }
  globalThis.SetAuthSwtich?.((p) => !p);
}

globalThis.WAS_PREV_AUTH = !!authBot?.id;
if (authBot?.id) {
  if(!globalThis.CountIgnoreSave){
    globalThis.CountIgnoreSave = 0;
  }
  globalThis.CountIgnoreSave++;
  if(playlistsToSave.length === 0  && globalThis.CountIgnoreSave <2){
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
  throw new Error("User not logged in!");
}
