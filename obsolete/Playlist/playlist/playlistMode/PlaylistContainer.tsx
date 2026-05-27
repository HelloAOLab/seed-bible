// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank
// number -> Index of chpater / verse / book

const { useState, useLayoutEffect } = os.appHooks;
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
    !!G[`${id}creatingPlaylist`] || false
  );

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
