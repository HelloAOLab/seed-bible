import { effect } from "@preact/signals";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import type { PlaylistQueueContainerProps } from "ext_discover.interfaces.components.PlaylistQueueContainer";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function PlaylistQueueContainer({
  manager,
  name,
  list,
  broken,
  playlistID,
  id,
  isLayers,
  queueKeyName,
  index,
}: PlaylistQueueContainerProps) {
  const playlistListUiRef = { current: null as HTMLDivElement | null };
  const DragDropT = G.DragDrop;

  const runBlinkLastPlaylistItem = () => {
    const root = playlistListUiRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll(".playlist-item-type");
    const last = nodes[nodes.length - 1] as HTMLElement | undefined;
    if (!last) return;
    last.classList.remove("playlist-item-blink");
    void last.offsetWidth;
    const done = () => last.classList.remove("playlist-item-blink");
    const safety = window.setTimeout(done, 1800);
    last.addEventListener(
      "animationend",
      () => {
        window.clearTimeout(safety);
        done();
      },
      { once: true }
    );
    last.classList.add("playlist-item-blink");
    last.scrollIntoView({ behavior: "smooth" });
  };

  if (playlistID) {
    if (!G["defaultplaylistProgress"]) G["defaultplaylistProgress"] = {};
    if (!G["defaultplaylistChecked"]) G["defaultplaylistChecked"] = {};
    G["defaultplaylistProgress"][playlistID] = {
      ...manager.itemVisitedMap.value,
    };
    G["defaultplaylistChecked"][playlistID] = {
      ...(G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}),
    };
    G?.savePlaylistProgress && G.savePlaylistProgress(playlistID);
  }

  effect(() => {
    void list;
    if (G.BlinkAfterPlaylistAddRef != queueKeyName) return;
    G.BlinkAfterPlaylistAddRef = false;
    runBlinkLastPlaylistItem();
    return () => {
      if (G.BlinkAfterPlaylistAddRef == queueKeyName) {
        G.BlinkAfterPlaylistAddRef = false;
      }
    };
  });

  return (
    <div
      ref={playlistListUiRef}
      className="link-playlist"
      style={{ width: "100%" }}
    >
      {index !== 0 && (
        <div className="align-center justify-between heading-queue">
          <h4 key={`heading${id}`} style={{ margin: "0" }}>
            {broken ? "" : "Next in "}
            {name}
          </h4>
          <span
            onClick={() =>
              manager.setQueueDeleteConfirm(parseInt(queueKeyName))
            }
            style={{ cursor: "pointer" }}
            className="material-symbols-outlined unfollow"
          >
            delete
          </span>
        </div>
      )}
      <DragDropT
        key={id}
        setRef={manager.refs.value}
        isPlayer={G.PPchecklistEnabled}
        currentFormat={manager.currentFormat}
        list={list}
        playingPlaylist={true}
        layers={true}
        currentDateActive={manager.activeDate.value}
        editDataFromPlaylist={(data: any, play = true) =>
          manager.editDataFromPlaylist(data, queueKeyName, play)
        }
        checkListData={
          G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}
        }
        setList={(newList: any) => {
          let listLatest = [...newList];
          if (typeof newList === "function") listLatest = newList(list);
          G.SetPlayingPlaylists?.((prev: any) => ({
            ...prev,
            [queueKeyName]: { name, list: listLatest },
          }));
        }}
        activeItemID={
          queueKeyName == G.CurrentIndexItem?.key
            ? manager.playerState.value.currentItemID
            : 0
        }
        deleteFromList={(idx: any, pId: any, itemId: any) => {
          manager.onDeleteFromQueue(queueKeyName, idx, pId, itemId);
        }}
        isDeleteShow
        creatingPlaylist={false}
        onClick={(params: any) => {
          const { dataItem, bulkAdd, justPlay } = params;
          DataManager.cancelCurrentPlayingSound();
          if (justPlay) {
            navigationWithDataItem({ dataItem }, getPlaylistBot());
            return;
          }
          manager.onClick({ dataItem, bulkAdd, key: queueKeyName });
        }}
        onClickItem={() => {}}
      />
    </div>
  );
}
