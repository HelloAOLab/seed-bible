const { useState, useMemo, useLayoutEffect } = os.appHooks;
const G = globalThis as any;
const { Button } = G.Components;

const PlaylistRowItem = await thisBot.PlaylistRowItem();

const AddToPlaylist = ({
  id = "default",
  onClose,
}: {
  id: string;
  onClose: () => void;
}) => {
  const [playLists, setPlayLists] = useState(G[`${id}playlists`] || []);

  const [filteredPlaylist] = useMemo(() => {
    const shared: any[] = [];
    const owned: any[] = [];
    playLists.forEach((ele: any) => {
      if (ele.shareProfileName && ele.sharerID !== authBot?.id) {
        shared.push({ ...ele });
      } else {
        owned.push({ ...ele });
      }
    });
    return [owned];
  }, [playLists]);

  const onSelectPlaylist = (playlistId: string) => {
    if (G[`${id}SetPlaylists`]) {
      G[`${id}SetPlaylists`]((prev: any) => {
        const old = [...prev];
        const index = old.findIndex((ele) => ele.id === playlistId);
        if (index > -1) {
          old[index].list = [...old[index].list, ...G.AddToPlaylistData];
        }
        return old;
      });
    }
    const items = [...G.AddToPlaylistData];
    const playlistIds = items.reduce((acc: any, ele: any) => {
      acc[ele.id] = true;
      return acc;
    }, {});
    G.LasttAddedToPlaylist = playlistIds;
    const verses = items
      .map((ele) => ele.additionalInfo.verse)
      .sort((a, b) => a - b);
    const ranges = G.GetVerseSummaryHeading(verses);
    const heading = `${items[0].content.split(":")[0]}:${ranges.join(", ")}`;

    ShowNotification({
      message: t("headingAddedToPlaylist", { heading }),
      severity: "success",
      onUndoActions: () => {
        G[`${id}SetPlaylists`]((prev: any) => {
          const old = [...prev];
          const index = old.findIndex((ele) => ele.id === playlistId);
          if (index > -1) {
            old[index].list = old[index].list.filter(
              (ele: any) => !G.LasttAddedToPlaylist[ele.id]
            );
          }
          return old;
        });
        ShowNotification({
          message: t("undoActionSuccessfull", { heading }),
          severity: "success",
        });
      },
    });
    onClose();
  };

  const onAddNewPlaylist = () => {
    G[`${id}currentPlaylist`] = G.AddToPlaylistData;
    G.SetTab("create");
    G[`${id}mode`] = G.PlaylistModeTypes.playlist;
    onClose();
  };

  useLayoutEffect(() => {
    return () => {
      G.AddToPlaylistData = null;
    };
  }, []);

  return (
    <>
      <div className="add-to-playlist-container reset-css">
        <div className="add-to-playlist-header">
          <h1>Add to Playlist</h1>
          <span
            style={{ cursor: "pointer" }}
            onClick={onClose}
            className="material-symbols-outlined"
          >
            close
          </span>
        </div>
        <div className="add-to-playlist-body">
          {filteredPlaylist.length === 0 && (
            <p
              style={{
                cursor: "pointer",
                color: "var(--secondaryColor)",
                fontSize: "14px",
              }}
            >
              No playlists found but you can create a new one.
            </p>
          )}
          {filteredPlaylist.map((playlist: any, index: number) => {
            const {
              shareProfileName,
              access,
              name: playlistName,
              list,
              id,
              description,
              readingPlanEnabled,
              dateFormat,
              attachment,
              checklistEnabled,
              color,
              icon,
              isCustomColor,
              isCustomIcon,
              selectedTags,
              isLayers,
            } = playlist;

            return (
              <PlaylistRowItem
                shareProfileName={shareProfileName}
                access={access}
                isCustomIcon={isCustomIcon}
                totalItem={playLists.length}
                viewOnly={true}
                parentId="default"
                playingPlaylist={false}
                setOpenedList={() => {}}
                opendedList={{}}
                selectedTags={selectedTags}
                isLayers={isLayers}
                attachment={attachment}
                currentFormat={dateFormat}
                checklistEnabled={checklistEnabled}
                readingPlanEnabled={readingPlanEnabled}
                dragOverSet={{}}
                key={id}
                id={id}
                playListIndex={index}
                creatingPlaylist={false}
                setPlaylists={setPlayLists}
                name={playlistName}
                list={list}
                color={color}
                icon={icon}
                isCustomColor={isCustomColor}
                description={description}
                onSelectPlaylist={onSelectPlaylist}
              />
            );
          })}
          <div style={{ width: "max-content", marginTop: "0.5rem" }}>
            <Button secondary onClick={onAddNewPlaylist}>
              + {t("addToNew")}
            </Button>
          </div>
        </div>
      </div>
      <style>{thisBot.tags["AddToPlaylist.css"]}</style>
    </>
  );
};

return AddToPlaylist;
