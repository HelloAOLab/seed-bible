import { savePlaylists } from "ext_discover.helper.savePlaylists";
import { getStorageBot } from "ext_discover.storage.getStorageBot";

export async function historySaver(that?: { force?: boolean }) {
  const G = globalThis as Record<string, any>;
  const storageBot = getStorageBot();

  if (storageBot.tags?.historySaverIntialized && !that?.force) {
    return;
  }

  setTagMask(storageBot, "historySaverIntialized", true);

  const setHistory = (newHistory: any[] = [], id = "default") => {
    setTag(storageBot, `${id}playlistHistory`, newHistory);
  };

  G.setHistoryLocale = setHistory;

  const historyPresent = (getTag(storageBot, "defaultplaylistHistory") || [])
    .filter((ele: any) => ele.content !== "undefined")
    .map((ele: any) => ele);

  const parallelPlaylistPresent = getTag(storageBot, "playlistLists") || {
    default: {
      active: true,
      deleteable: false,
      link: "",
    },
  };

  const collectionsPresent = getTag(storageBot, "defaultCollections") || [];

  G.defaultcurrentHistory = historyPresent;

  const setPlaylist = (
    newHistory: any[] = [],
    id = "default",
    skipApi = false,
    force = false
  ) => {
    if (!skipApi) {
      savePlaylists({
        playlists: newHistory,
        force: force,
      });
    }
    setTag(storageBot, `${id}playlistList`, newHistory);
  };

  const setPlaylists = (newHistory: Record<string, any> | null = null) => {
    if (newHistory) {
      setTag(storageBot, "playlistLists", newHistory);
    }
  };

  const setCollections = (newCollections = {}, id = "default") => {
    setTag(storageBot, `${id}Collections`, newCollections);
  };

  G.setPlaylistLocale = setPlaylist;
  G.setPlaylistsLocale = setPlaylists;
  G.setCollectionsLocale = setCollections;

  const loadPlaylistsFromApi = async () => {
    try {
      const authBot = await os.requestAuthBotInBackground();
      if (!authBot?.id) {
        return [];
      }
      G.SetPlaylistLoading?.(true);
      G.IsPlaylistLoading = true;
      G.WAS_PREV_AUTH = true;
      const apiResults = await os.getData(authBot.id, "playlists");
      G.SetPlaylistLoading?.(false);
      G.IsPlaylistLoading = false;
      G.SetLoadingPlaylistOptions?.(false);
      if (apiResults.data) {
        const playlists = [...(apiResults.data.playlists || [])];
        setTag(storageBot, "defaultplaylistList", playlists);
        G.setPlaylistLocale?.(playlists, "default", false, true);
        G.SetPlaylistLoading?.(false);
        G.IsPlaylistLoading = false;
        return playlists;
      }
      return [];
    } catch (err) {
      G.SetPlaylistLoading?.(false);
      G.SetLoadingPlaylistOptions?.(false);
      G.IsPlaylistLoading = false;
      console.log("err", err);
    }
    return [];
  };

  await loadPlaylistsFromApi();

  const playlistsPresent = G.playlists
    ? G.playlists
    : (getTag(storageBot, "defaultplaylistList") || []).map((ele: any) => ele);

  const sharedPlaylist = configBot.tags.Playlist;

  G.RECORD_SEPARATOR = "^_^";
  if (sharedPlaylist) {
    try {
      const [authBotId, playlistId] = sharedPlaylist.split(G.RECORD_SEPARATOR);
      if (!!authBotId && !!playlistId) {
        const res = await os.getData(authBotId, playlistId);
        if (res.success) {
          const playlistData = res.data;
          const index = playlistsPresent.findIndex(
            (ele: any) => ele.id === playlistData?.id
          );

          const isPlaylistDuplicate = index > -1;

          if (typeof playlistData === "object") {
            G.hasASharedPlaylist = playlistData.id;
            G.shareProfileName = playlistData.shareProfileName;
            G.shareProfilePic = playlistData.shareProfilePic;

            if (G["Playlist_package"]) {
              G.Playlist?.SharePlaylistModal?.({
                playlistSharerName: playlistData.shareProfileName,
              });
            }

            G.clickWait = false;
            G.isModalRegistered = false;
            G.isBlackFadeRegistered = false;
            G.demoInteractionWait = false;

            if (playlistData.icons) G.PREDEFINED_ICONS = playlistData.icons;

            if (isPlaylistDuplicate) {
              playlistsPresent[index] = playlistData;
            } else {
              playlistsPresent.push(playlistData);
            }
          }
        } else {
          ShowNotification({
            message: t("unableToCopyPlaylist"),
            severity: "error",
          });
        }
      }
      setTag(configBot, "Playlist", null);
    } catch (err) {
      console.log("ERROR PARSING THE SHARED PLAYLIST", err);
    }
  }

  Object.keys(parallelPlaylistPresent).forEach((id) => {
    if (!G[`${id}currentPlaylist`]) G[`${id}currentPlaylist`] = [];
    if (!G[`${id}currentHistory`]) G[`${id}currentHistory`] = [];
    G[`${id}playlists`] = G[`${id}playlists`]
      ? G[`${id}playlists`]
      : (getTag(storageBot, `${id}playlistList`) || []).map((ele: any) => ele);
    if (!G[`${id}playlists`]) {
      G[`${id}playlists`] = [];
    }
  });

  G["defaultplaylists"] = playlistsPresent;
  G.PlaylistsGroups = parallelPlaylistPresent;
  G.COLLECTIONS = collectionsPresent;
}
