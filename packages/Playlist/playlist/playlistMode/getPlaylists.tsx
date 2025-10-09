let apiResults = [];

let initialList = [];

let id = "default";

if (that?.initialList) {
  initialList = [...that.initialList];
}

if (that?.id) {
  id = that.id;
}
try {
  const authBot = await os.requestAuthBotInBackground();
  if (!authBot?.id) {
    return [];
  }
  globalThis.WAS_PREV_AUTH = true;
  apiResults = await os.getData(authBot.id, "playlists");
  if (apiResults.data) {
    const playlists = [...(apiResults.data.playlists || [])];
    apiResults = [...initialList, ...playlists];
    setTag(thisBot, "defaultplaylistList", apiResults);
    if(globalThis[`${id}SetPlaylists`]) {
        globalThis[`${id}SetPlaylists`](apiResults);
    }
    globalThis.setPlaylistLocale(apiResults, true);
    return apiResults;
  }
  return [];
} catch (err) {
  console.log("err", err);
}
return apiResults;
