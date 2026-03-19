os.unregisterApp("playlist-link-modal");
os.registerApp("playlist-link-modal", thisBot);

const ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px",
};

const onClose = () => {
  os.unregisterApp("playlist-link-modal");
  os.unregisterApp("mouseCursor");
};

const playlistParentId = that.parentId;
const id = that.id;
const idsMap = that.idsMap;
const G = globalThis as any;

const { Input, Modal, Button, ButtonsCover, Tooltip, Select } = G.Components;
const { useState, useLayoutEffect } = os.appHooks;

const PlaylistRowItem = await thisBot.PlaylistRowItem();
let playlistToLink = [];
let initialName = "";

if (idsMap) {
  const ids = Object.keys(idsMap);
  const tempArray: any[] = [];
  ids.forEach((id) => {
    const pId = idsMap[id];
    const originalPlaylist = G[`${pId}playlists`] || [];

    let plylist = { ...originalPlaylist.find((pl: any) => pl.id === id) };

    plylist.parentId = pId;
    tempArray.push(plylist);
  });
  playlistToLink = [...tempArray];
} else if (playlistParentId && id) {
  const originalPlaylist = G[`${playlistParentId}playlists`] || [];

  playlistToLink = [{ ...originalPlaylist.find((pl: any) => pl.id === id) }];

  playlistToLink[0].parentId = playlistParentId;
} else {
  const cc = that?.currentCollection || [];
  playlistToLink = [...cc];
  initialName = that.name;
}

playlistToLink = G.CLONE_DATA(playlistToLink);

const allPlaylistGroups = G.PlaylistsGroups;

const PlaylistLinkModal = () => {
  const [addList, setAddList] = useState(false);

  const [name, setName] = useState(initialName);
  const [playbackListID, setPlaybackListId] = useState("");
  const [playlistId, setPlaylistId] = useState("");

  const [collection, setCollection] = useState([...playlistToLink]);

  const onCurrentCollectionEdit = (props: any) => {
    const {
      data,
      playlistName,
      playListId,
      isDelete = false,
      index,
      removeID,
    } = props;
    const currentData = thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT;
    if (currentData?.id === data.id) {
      thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT = null;
      thisBot.cursorReset();
      return ShowNotification({
        message: t("cannotLinkWithItself"),
        severity: "error",
      });
    }
    if (isDelete) {
      setCollection((prev) => {
        const old = [...prev];
        const firstI = old.findIndex((e) => e.id === playListId);
        if (firstI > -1) {
          const secondIndex = old[firstI].list.findIndex(
            (e: any) => e.id === removeID
          );
          if (secondIndex > -1) {
            old[firstI].list[secondIndex].links?.splice(index, 1);
          }
        }
        return old;
      });
    } else {
      setCollection((prev) => {
        const old = [...prev];
        const firstI = old.findIndex((e) => e.id === currentData.playListId);
        if (firstI > -1) {
          const secondIndex = old[firstI].list.findIndex(
            (e: any) => e.id === currentData.id
          );
          if (secondIndex > -1) {
            if (old[firstI].list[secondIndex].links) {
              const isPresent =
                old[firstI].list[secondIndex].links.findIndex(
                  (d: any) => d.id === data.id
                ) > -1;
              if (isPresent) {
                ShowNotification({
                  message: t("alreadyLinkedWithTheItem"),
                  severity: "error",
                });
              } else {
                old[firstI].list[secondIndex].links.push({
                  ...data,
                  playlistName,
                  playListId,
                });
              }
            } else {
              old[firstI].list[secondIndex].links = [
                {
                  ...data,
                  playlistName,
                  playListId,
                },
              ];
            }
          }
        }
        return old;
      });
    }
    thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT = null;
    thisBot.cursorReset();
  };

  useLayoutEffect(() => {
    G.onCurrentCollectionEdit = onCurrentCollectionEdit;

    return () => {
      G.onCurrentCollectionEdit = null;
    };
  }, [collection]);

  const PLAYBACK_OPTIONS = Object.keys(allPlaylistGroups).map((id, i) => ({
    label: `Playback List ${i + 1}`,
    value: id,
  }));

  const PLAYLIST_OPTIONS = (G[`${playbackListID}playlists`] || []).map(
    (playlist: any) => ({
      label: playlist.name,
      value: playlist.id,
    })
  );

  const onCloseAddList = () => {
    setPlaybackListId("");
    setPlaylistId("");
    setAddList(false);
  };

  const saveCollections = () => {
    if (!name)
      return ShowNotification({
        message: t("pleaseEnterAName"),
        severity: "error",
      });
    const namesPresent = Object.keys(G.COLLECTIONS || {})
      .map((ele) => G.COLLECTIONS[ele].name)
      .filter((n) => n !== initialName);
    if (
      namesPresent.findIndex(
        (nam) => nam.toLocaleLowerCase() === name.trim().toLocaleLowerCase()
      ) > -1
    )
      return ShowNotification({
        message: t("nameAlreadyPresent"),
        severity: "error",
      });
    const idNew = G.EDIT_COLLECTION_ID || G.createUUID();
    if (G.COLLECTIONS) {
      G.COLLECTIONS = {
        ...G.COLLECTIONS,
        [idNew]: {
          collection,
          name: name.trim(),
        },
      };
    } else {
      G.COLLECTIONS = {
        [idNew]: {
          collection,
          name: name.trim(),
        },
      };
    }
    if (G.COLLECTION_SETTER) {
      G.COLLECTION_SETTER(G.COLLECTIONS);
    }
    G.EDIT_COLLECTION_ID = null;
    onClose();
  };

  return (
    <>
      <Modal
        sxContainer={{ width: "auto" }}
        title={initialName ? "Edit Your Collection" : "Add To Collection"}
        showIcon={false}
        styles={{
          width: `${Math.max(collection.length ? 1 : 1, 1) * 396 + 36}px`,
        }}
        onClose={onClose}
      >
        <Input
          value={name}
          onChangeListener={setName}
          placeholder="Collection's Name"
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexDirection: "column",
          }}
        >
          {collection.map((coll) => (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "90dvh",
                width: "100%",
                overflow: "auto",
                position: "relative",
              }}
            >
              <PlaylistLinkedContainer playlist={coll} />
              <span
                class="material-symbols-outlined unfollow"
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  background: "white",
                  ...ButtonStyle,
                }}
                onClick={() => {
                  if (that.id === coll.id)
                    return ShowNotification({
                      message: t("cannotDeleteOriginalPlaylist"),
                      severity: "error",
                    });
                  setCollection((prev) => prev.filter((c) => c.id !== coll.id));
                }}
              >
                delete
              </span>
            </div>
          ))}
        </div>
        <ButtonsCover>
          <Button secondary isDisabled={!name} onClick={saveCollections}>
            {t("save")}
          </Button>
          <Button onClick={() => setAddList(true)} secondary>
            {collection.length > 1
              ? t("addAnotherPlaylist")
              : t("addAPlaylist")}
          </Button>
          <Button onClick={onClose} secondaryAlt>
            {t("close")}
          </Button>
        </ButtonsCover>
      </Modal>

      {addList && (
        <Modal showIcon={false} onClose={onCloseAddList}>
          <h4>{t("addAnotherPlaylist")}:</h4>
          <div style={{ paddingTop: "4px" }}>
            <Select
              secondary
              value={playbackListID}
              onChangeListener={(val: any) => {
                setPlaybackListId(val);
                setPlaylistId("");
              }}
              name={t("selectPlaybackList") + ":"}
              options={[
                { disabled: true, value: "", label: t("selectParallelList") },
                ...PLAYBACK_OPTIONS,
              ]}
            />
          </div>
          <div style={{ paddingTop: "4px" }}>
            <Select
              secondary
              disabled={PLAYLIST_OPTIONS.length < 1}
              value={playlistId}
              onChangeListener={(val: any) => {
                setPlaylistId(val);
              }}
              name={t("selectPlaylist") + ":"}
              options={[
                { disabled: true, value: "", label: t("selectPlaylistList") },
                ...PLAYLIST_OPTIONS,
              ]}
            />
          </div>

          <ButtonsCover>
            <Button onClick={onCloseAddList} secondaryAlt>
              {t("close")}
            </Button>

            <Button
              secondary
              isDisabled={!playlistId}
              onClick={() => {
                if (collection.findIndex((pl) => pl.id === playlistId) > -1)
                  return ShowNotification({
                    message: t("playlistAlreadyPresent"),
                    severity: "error",
                  });
                const pl = G[`${playbackListID}playlists`].find(
                  (ele: any) => ele.id === playlistId
                );
                setCollection((prev) => [...prev, pl]);
                onCloseAddList();
              }}
            >
              {t("add")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
    </>
  );
};

// <div style={{ position: "absolute", left: "0.5rem", top: "0.5rem" }} onClick={() => setAddList(true)}>
//     <span style={ButtonStyle} class="material-symbols-outlined">
//         library_add
//     </span>
// </div>
// <div style={{ position: "absolute", right: "0.5rem", top: "0.5rem" }} onClick={() => saveCollections()}>
//     <span style={ButtonStyle} class="material-symbols-outlined">
//         book
//     </span>
// </div>

const PlaylistLinkedContainer = (props: any) => {
  const { playlist } = props;
  return (
    <PlaylistRowItem
      viewOnly={true}
      linkingMode={true}
      parentId={playlist.parentId}
      playingPlaylist={false}
      handleDragStart={() => {}}
      setOpenedList={() => {}}
      opendedList={playlist.id}
      handleDragOver={() => {}}
      handleDragEnd={() => {}}
      dragOverSet={() => {}}
      id={playlist.id}
      name={playlist.name}
      list={playlist.list}
    />
  );
};

os.compileApp("playlist-link-modal", <PlaylistLinkModal />);
