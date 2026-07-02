import { addToPlaylistCss } from "ext_discover.css.addToPlaylistCss";
import { PlaylistRowItem } from "ext_discover.components.PlaylistRowItem";
import { getAddToPlaylistManager } from "ext_discover.managers.AddToPlaylistManager";
import type { AddToPlaylistProps } from "ext_discover.interfaces.components.AddToPlaylist";
import type { DragOverSet } from "ext_discover.models.playlistList";
import { Button } from "ext_discover.features.components.Button";

const noopDrag = () => {};
const emptyDragOverSet: DragOverSet = {};

export function AddToPlaylist({
  id = "default",
  onClose,
  manager = getAddToPlaylistManager(id),
}: AddToPlaylistProps) {
  manager.mount();

  const handleClose = () => {
    manager.unmount();
    onClose();
  };

  const playlists = manager.filteredPlaylist.value;

  return (
    <>
      <div className="add-to-playlist-container reset-css">
        <div className="add-to-playlist-header">
          <h1>Add to Playlist</h1>
          <span
            style={{ cursor: "pointer" }}
            onClick={handleClose}
            className="material-symbols-outlined"
          >
            close
          </span>
        </div>
        <div className="add-to-playlist-body">
          {playlists.length === 0 && (
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
          {playlists.map((playlist: any, index: number) => {
            const {
              shareProfileName,
              access,
              name: playlistName,
              list,
              id: playlistId,
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
                key={playlistId}
                shareProfileName={shareProfileName}
                access={access}
                isCustomIcon={isCustomIcon}
                totalItem={manager.playLists.value.length}
                viewOnly={true}
                parentId={id}
                playingPlaylist={false}
                setOpenedList={() => {}}
                opendedList={{}}
                selectedTags={selectedTags}
                isLayers={isLayers}
                attachment={attachment}
                currentFormat={dateFormat}
                checklistEnabled={checklistEnabled}
                readingPlanEnabled={readingPlanEnabled}
                dragOverSet={emptyDragOverSet}
                id={playlistId}
                playListIndex={index}
                creatingPlaylist={false}
                setPlaylists={manager.setPlayLists}
                name={playlistName}
                list={list}
                color={color}
                icon={icon}
                isCustomColor={isCustomColor}
                description={description}
                onSelectPlaylist={(playlistRowId) =>
                  manager.onSelectPlaylist(playlistRowId, handleClose)
                }
                handleDragStart={noopDrag}
                handleDragOver={noopDrag}
                handleDragEnd={noopDrag}
              />
            );
          })}
          <div style={{ width: "max-content", marginTop: "0.5rem" }}>
            <Button
              secondary
              onClick={() => manager.onAddNewPlaylist(handleClose)}
            >
              + {t("addToNew")}
            </Button>
          </div>
        </div>
      </div>
      <style>{addToPlaylistCss}</style>
    </>
  );
}
