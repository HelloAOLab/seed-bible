// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank
// number -> Index of chpater / verse / book

const { useState } = os.appHooks;
const G = globalThis as any;
const Playlist = await thisBot.Playlist();
const History = await thisBot.History();

const PlaylistContainer = (props: any) => {
  const {
    id,
    selectedChip,
    query,
    setOpenModal,
    isLayers,
    active,
    playingPlaylist,
  } = props;

  const [view, setview] = useState(0);

  const [creatingPlaylist, setCreatingPlaylist] = useState(
    !!G[`${id}creatingPlaylist`] && false
  );

  // && false is hardcore

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // minWidth: `min(396p    flex-gro            flexGrow: '1',
          width: "100%",
          marginTop: "12px",
        }}
      >
        {!creatingPlaylist && false && (
          <div className="tabs-playlist">
            <p
              class="playlist-action"
              onClick={() => setOpenModal((p: any) => !p)}
            >
              ✙ Add Parallel Playlist
            </p>
            <p>
              <span
                class="material-symbols-outlined unfollow"
                style={{ ...G.ButtonStyle }}
                onClick={() => {
                  if (id === "default")
                    return ShowNotification({
                      message: "Cannot Delete Original Playlist!",
                      severity: "error",
                    });
                  G.SetPlaylistGroups((prev: any) => {
                    const old = { ...prev };
                    delete old[id];
                    return old;
                  });
                  G[`${id}AddDataToPlaylist`] = null;
                  G[`${id}ResetPlaylist`] = null;
                  G[`${id}SetCreatingPlaylist`] = null;
                  G[`${id}SetPlaylistName`] = null;
                  G[`${id}AddPlaylist`] = null;
                  G[`${id}creatingPlaylistName`] = null;
                  G[`${id}currentPlaylist`] = null;
                  G[`${id}playlists`] = null;
                  G[`${id}Attachments`] = null;
                  G[`${id}SetAttachments`] = null;
                  G[`${id}SetPlaylists`] = null;
                  G[`${id}SetChecklist`] = null;
                  G[`${id}HISTORYExploreMode`] = false;
                  G[`${id}isEditMode`] = null;
                  G[`${id}isEditModeSubID`] = null;
                }}
              >
                delete
              </span>
            </p>
          </div>
        )}

        <div className="playlist-container-data">
          <Playlist
            id={id}
            selectedChip={selectedChip}
            query={query}
            isLayers={isLayers}
            playingPlaylist={playingPlaylist}
            creatingPlaylist={creatingPlaylist}
            setCreatingPlaylist={setCreatingPlaylist}
          />
        </div>
      </div>
    </>
  );
};

return PlaylistContainer;
