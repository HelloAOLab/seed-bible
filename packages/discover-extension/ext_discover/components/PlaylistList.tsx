import { getPlaylistListManager } from "ext_discover.managers.PlaylistListManager";
import { PlaylistRowItem } from "ext_discover.components.PlaylistRowItem";
import type { PlaylistListProps } from "ext_discover.interfaces.components.PlaylistList";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";

export function PlaylistList({
  scope,
  parentId,
  extraActions = () => {},
  mergeMode = false,
  selectedPlaylists,
  setSelectPlaylist,
  selectPlaylist = false,
  playLists,
  setPlayLists,
  creatingPlaylist = false,
  playingPlaylist = false,
  isLayers,
  list = getPlaylistListManager(scope ?? parentId),
}: PlaylistListProps) {
  list.syncContext({ parentId, playingPlaylist });

  const visiblePlaylists = playLists.filter((pl) =>
    !playingPlaylist ? true : pl.id === playingPlaylist
  );

  return (
    <div
      onClick={() => extraActions()}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {list.playlistLoading.value && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <LoaderSecondary />
        </div>
      )}
      {playLists.length === 0 && !list.playlistLoading.value && (
        <p>{isLayers ? t("noLayersToShow") : t("noPlaylistsToShow")}</p>
      )}
      {!list.playlistLoading.value &&
        visiblePlaylists.map((playlist, index) => {
          const {
            shareProfileName,
            access,
            name: playlistName,
            list: playlistItems,
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
            isLayers: playlistIsLayers,
          } = playlist as Record<string, unknown>;

          return (
            <PlaylistRowItem
              key={id as string}
              selectPlaylist={selectPlaylist}
              shareProfileName={shareProfileName as string | undefined}
              selectedPlaylists={selectedPlaylists}
              access={access as string | undefined}
              setSelectPlaylist={setSelectPlaylist}
              isCustomIcon={isCustomIcon as boolean | undefined}
              toggle={list.toggle.value}
              totalItem={playLists.length}
              parentId={parentId}
              playingPlaylist={playingPlaylist}
              handleDragStart={(idx) => list.handleDragStart(idx, playLists)}
              setOpenedList={list.setOpenedList}
              opendedList={list.openedList.value}
              selectedTags={selectedTags}
              isLayers={playlistIsLayers as boolean | undefined}
              attachment={attachment}
              currentFormat={dateFormat as string | undefined}
              checklistEnabled={checklistEnabled as boolean | undefined}
              handleDragOver={(idx) => list.handleDragOver(idx, playLists)}
              readingPlanEnabled={readingPlanEnabled as boolean | undefined}
              handleDragEnd={() =>
                list.handleDragEnd(playLists, setPlayLists, mergeMode)
              }
              dragOverSet={list.dragOverSet.value}
              id={id as string}
              playListIndex={index}
              creatingPlaylist={creatingPlaylist}
              setPlaylists={setPlayLists}
              name={playlistName as string}
              list={(playlistItems as Record<string, unknown>[]) ?? []}
              color={color as string | undefined}
              icon={icon as string | undefined}
              isCustomColor={isCustomColor as boolean | undefined}
              description={description as string | undefined}
            />
          );
        })}
    </div>
  );
}
