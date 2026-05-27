let apiResults: any = [];

let initialList: any[] = [];

const G = globalThis as any;

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
  G.SetPlaylistLoading?.(true);
  G.IsPlaylistLoading = true;
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
    G.SetLoadingPlaylistOptions?.(false);
    G.SetPlaylistLoading?.(false);
    G.IsPlaylistLoading = false;
    G.SetLoadingPlaylistOptions?.(false);
    return apiResults;
  }
  G.SetPlaylistLoading?.(false);
  G.IsPlaylistLoading = false;
  G.SetLoadingPlaylistOptions?.(false);
  return [];
} catch (err) {
  G.SetPlaylistLoading?.(false);
  G.IsPlaylistLoading = false;
  G.SetLoadingPlaylistOptions?.(false);
  console.log("err", err);
}
return apiResults;
