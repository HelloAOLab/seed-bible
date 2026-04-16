const G = globalThis as any;

if (thisBot.tags.historySaverIntialized && !that?.force) return;

setTagMask(thisBot, "historySaverIntialized", true);

const setHistory = (newHistory = [], id = "default") => {
  setTag(thisBot, `${id}playlistHistory`, newHistory);
};

G.setHistoryLocale = setHistory;

const historyPresent = (getTag(thisBot, "defaultplaylistHistory") || [])
  .filter((ele: any) => ele.content !== "undefined")
  .map((ele: any) => ele);

const parallelPlaylistPresent = getTag(thisBot, "playlistLists") || {
  default: {
    active: true,
    deleteable: false,
    link: "",
  },
};

const collectionsPresent = getTag(thisBot, "defaultCollections") || [] || {};

G.defaultcurrentHistory = historyPresent;

// Playlist

const setPlaylist = (
  newHistory = [],
  id = "default",
  skipApi = false,
  force = false
) => {
  if (!skipApi) {
    thisBot.savePlaylists({
      playlists: newHistory,
      force: force,
    });
  }
  setTag(thisBot, `${id}playlistList`, newHistory);
};

const setPlaylists = (newHistory = null) => {
  if (newHistory) {
    setTag(thisBot, "playlistLists", newHistory);
  }
};

const setCollections = (newCollections = {}, id = "default") => {
  setTag(thisBot, `${id}Collections`, newCollections);
};

G.setPlaylistLocale = setPlaylist;
G.setPlaylistsLocale = setPlaylists;
G.setCollectionsLocale = setCollections;

const getPlaylists = async () => {
  let apiResults: any = [];
  try {
    const authBot = await os.requestAuthBotInBackground();
    if (!authBot?.id) {
      return [];
    }
    G.SetPlaylistLoading?.(true);
    G.IsPlaylistLoading = true;
    G.WAS_PREV_AUTH = true;
    apiResults = await os.getData(authBot.id, "playlists");
    G.SetPlaylistLoading?.(false);
    G.IsPlaylistLoading = false;
    G.SetLoadingPlaylistOptions?.(false);
    if (apiResults.data) {
      const playlists = [...(apiResults.data.playlists || [])];
      apiResults = [...playlists];
      setTag(thisBot, "defaultplaylistList", playlists);
      G.setPlaylistLocale &&
        G.setPlaylistLocale(playlists, "default", false, true);
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
  return apiResults;
};

await getPlaylists();

const playlistsPresent = G.playlists
  ? G.playlists
  : (getTag(thisBot, "defaultplaylistList") || []).map((ele: any) => ele);

const sharedPlaylist =
  configBot.tags.Playlist ||
  "438d487a-bf23-4550-988a-9e3399ea4407^_^03c06a6b-a112-4b46-964a-c5b13cca4518";
// console.log("GOT SHAERD PLATLIST", sharedPlaylist);

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
          // const toutour = getBot('system', 'main.totourTool')
          G.hasASharedPlaylist = playlistData.id;
          G.shareProfileName = playlistData.shareProfileName;
          G.shareProfilePic = playlistData.shareProfilePic;

          if (G["Playlist_package"]) {
            // G["Playlist_package"].onClick();
            G.Playlist.SharePlaylistModal({
              playlistSharerName: playlistData.shareProfileName,
            });
          }
          // setTagMask(toutour, "showingStep", false);
          // setTagMask(toutour, "access", false);
          // setTagMask(toutour, "isBookClicked", true);

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
    : (getTag(thisBot, `${id}playlistList`) || []).map((ele: any) => ele);
  // console.log("ID", id, globalThis[`${id}playlists`]);
  if (!G[`${id}playlists`]) {
    G[`${id}playlists`] = [];
  }
});

G["defaultplaylists"] = playlistsPresent;
G.PlaylistsGroups = parallelPlaylistPresent;
G.COLLECTIONS = collectionsPresent;
