if (thisBot.tags.historySaverIntialized) return;

setTagMask(thisBot, "historySaverIntialized", true);

const setHistory = (newHistory = [], id) => {
    setTag(thisBot, `${id}playlistHistory`, newHistory);
}

globalThis.setHistoryLocale = setHistory;

const historyPresent = (getTag(thisBot, "defaultplaylistHistory") || []).filter(ele => ele.content !== "undefined").map(ele => ele);

const parallelPlaylistPresent = getTag(thisBot, "playlistLists") || {
    default: {
        active: true,
        deleteable: false,
        link: ''
    },
};


const collectionsPresent = (getTag(thisBot, "defaultCollections") || []) || {};


globalThis.defaultcurrentHistory = historyPresent;

// Playlist

const setPlaylist = (newHistory = [], id) => {
    setTag(thisBot, `${id}playlistList`, newHistory);
}

const setPlaylists = (newHistory = null) => {
    if (newHistory) {
        setTag(thisBot, "playlistLists", newHistory);
    }
}

const setCollections = (newCollections = {}, id = "default") => {
    setTag(thisBot, `${id}Collections`, newCollections);
}


globalThis.setPlaylistLocale = setPlaylist;
globalThis.setPlaylistsLocale = setPlaylists;
globalThis.setCollectionsLocale = setCollections;

const playlistsPresent = globalThis.playlists ? globalThis.playlists : (getTag(thisBot, "defaultplaylistList") || []).map(ele => ele);

const sharedPlaylist = configBot.tags.sharedPlaylist;
// console.log("GOT SHAERD PLATLIST", sharedPlaylist);


if (sharedPlaylist) {
    try {

        web.hook({
            url: `https://theographic-bible-api.netlify.app/api/playlist/getPlaylist?uid=${sharedPlaylist}`,
            method: 'GET',
        }).then(async (dbRes) => {
            // console.log(dbRes, "dbRes");
            const playlistDataRes = dbRes?.data?.data?.query;
            // console.log("playlistDataRes", API, !playlistDataRes, playlistDataRes);
            if (!playlistDataRes) return;
            // API.decrypt()
            const playlistDecoded = playlistDataRes;
            // console.log("playlistDecoded", playlistDecoded);
            const playlistData = JSON.parse(`${playlistDecoded}`);

            setTag(configBot, "sharedPlaylist", null);

            const index = playlistsPresent.findIndex(ele => ele.id === playlistData?.id);

            const isPlaylistDuplicate = index > -1;

            if (typeof playlistData === "object") {
                // const toutour = getBot('system', 'main.totourTool')
                globalThis.hasASharedPlaylist = playlistData.id;

                if (globalThis.SetScreens) {
                    await Playlist.tryInitPlaylistMaker();
                    globalThis.SetScreens({value:2});
                }
                // setTagMask(toutour, "showingStep", false);
                // setTagMask(toutour, "access", false);
                // setTagMask(toutour, "isBookClicked", true);

                globalThis.clickWait = false;
                globalThis.isModalRegistered = false;
                globalThis.isBlackFadeRegistered = false;
                globalThis.demoInteractionWait = false;

                if (playlistData.icons) globalThis.PREDEFINED_ICONS = playlistData.icons;

                if (isPlaylistDuplicate) {
                    playlistsPresent[index] = playlistData;
                } else {
                    playlistsPresent.push(playlistData);
                }
            }
            // console.log(playlistsPresent);
        }).catch((err) => {
            console.log(err);
            ShowNotification({ message: "Unable to copy playlist. Please try again!", severity: "error" });
        })
    } catch (err) {
        console.log("ERROR PARSING THE SHARED PLAYLIST", err);
    }
}


Object.keys(parallelPlaylistPresent).forEach(id => {
    if (!globalThis[`${id}currentPlaylist`]) globalThis[`${id}currentPlaylist`] = [];
    if (!globalThis[`${id}currentHistory`]) globalThis[`${id}currentHistory`] = [];
    globalThis[`${id}playlists`] = globalThis[`${id}playlists`] ? globalThis[`${id}playlists`] : (getTag(thisBot, `${id}playlistList`) || []).map(ele => ele);;
    // console.log("ID", id, globalThis[`${id}playlists`]);
})

globalThis['defaultplaylists'] = playlistsPresent;
globalThis.PlaylistsGroups = parallelPlaylistPresent;
globalThis.COLLECTIONS = collectionsPresent;