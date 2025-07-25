// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank  
// number -> Index of chpater / verse / book

const { useState, useEffect } = os.appHooks;

const Playlist = await thisBot.Playlist();
const History = await thisBot.History();

const PlaylistContainer = ({ id, setOpenModal, active, playingPlaylist }) => {

    const [view, setview] = useState(0);

    const [creatingPlaylist, setCreatingPlaylist] = useState(
        !!globalThis[`${id}creatingPlaylist`]
    );


    return <>
        <div style={{
            display: "flex",
            flexDirection: "column",
            // minWidth: `min(396p    flex-gro            flexGrow: '1',
            width: '100%',
            padding: "12px"
        }}>

            {!creatingPlaylist && false && <div className="tabs-playlist">
                <p class="playlist-action" onClick={() => setOpenModal(p => !p)}>
                    ✙ Add Parallel Playlist
                </p>
                <p>
                    <span class="material-symbols-outlined unfollow" style={ButtonStyle}
                        onClick={() => {
                            if (id === "default") return ShowNotification({ message: "Cannot Delete Original Playlist!", severity: "error" });
                            SetPlaylistGroups(prev => {
                                const old = { ...prev };
                                delete old[id];
                                return old;
                            });
                            globalThis[`${id}AddDataToPlaylist`] = null;
                            globalThis[`${id}ResetPlaylist`] = null;
                            globalThis[`${id}SetCreatingPlaylist`] = null;
                            globalThis[`${id}SetPlaylistName`] = null;
                            globalThis[`${id}AddPlaylist`] = null;
                            globalThis[`${id}creatingPlaylistName`] = null;
                            globalThis[`${id}currentPlaylist`] = null;
                            globalThis[`${id}playlists`] = null;
                            globalThis[`${id}Attachments`] = null;
                            globalThis[`${id}SetAttachments`] = null;
                            globalThis[`${id}SetPlaylists`] = null;
                            globalThis[`${id}SetChecklist`] = null;
                            globalThis[`${id}HISTORYExploreMode`] = false;
                            globalThis[`${id}isEditMode`] = null;
                            globalThis[`${id}isEditModeSubID`] = null;
                        }}
                    >
                        delete
                    </span>
                </p>
            </div>}

            <div className="playlist-container-data">
                <Playlist
                    id={id}
                    playingPlaylist={playingPlaylist}
                    creatingPlaylist={creatingPlaylist}
                    setCreatingPlaylist={setCreatingPlaylist}
                />
            </div>
        </div>
    </>
}

return PlaylistContainer;