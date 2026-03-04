let apiResults: any = [];

let initialList: any[] = [];

const G = globalThis;

let id = "default";

if (that?.initialList) {
  initialList = [...that.initialList];
}

const initialPlaylistsIds: Record<string, string> = {};
if (that?.initialList) {
  that.initialList.forEach((ele: any) => {
    initialPlaylistsIds[ele.id] = ele.id;
  });
}

if (that?.id) {
  id = that.id;
}
try {
  const authBot = await os.requestAuthBotInBackground();
  if (!authBot?.id) {
    return [];
  }
  G.WAS_PREV_AUTH = true;
  apiResults = await os.getData(authBot.id, "playlists");
  if (apiResults.data) {
    const playlists = [...(apiResults.data.playlists || [])].filter(
      (ele: any) => !initialPlaylistsIds[ele.id]
    );
    apiResults = [...initialList, ...playlists];
    setTag(thisBot, "defaultplaylistList", apiResults);
    if (G[`${id}SetPlaylists`]) {
      G[`${id}SetPlaylists`](apiResults);
    }
    G.setPlaylistLocale(apiResults, true);
    return apiResults;
  }
  return [];
} catch (err) {
  console.log("err", err);
}
return apiResults;
