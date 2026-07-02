import { getStorageBot } from "ext_discover.storage.getStorageBot";

export async function getPlaylists(that?: {
  initialList?: any[];
  id?: string;
}) {
  let apiResults: any[] = [];
  let initialList: any[] = [];
  const G = globalThis as Record<string, any>;
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

    const response = await os.getData(authBot.id, "playlists");
    if (response.data) {
      const playlists = [...(response.data.playlists || [])].filter(
        (ele: any) => !initialPlaylistsIds[ele.id]
      );
      apiResults = [...initialList, ...playlists];
      setTag(getStorageBot(), "defaultplaylistList", apiResults);
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
}
