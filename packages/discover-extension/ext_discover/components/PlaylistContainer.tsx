import { getPlaylistContainerManager } from "ext_discover.managers.PlaylistContainerManager";
import { getPlaylistManager } from "ext_discover.managers.PlaylistManager";
import { Playlist } from "ext_discover.components.Playlist";
import type { PlaylistContainerProps } from "ext_discover.interfaces.components.PlaylistContainer";

export function PlaylistContainer({
  id,
  selectedChip,
  query,
  isLayers,
  isCreate,
  playingPlaylist,
  container = getPlaylistContainerManager(id),
}: PlaylistContainerProps) {
  const playlist = getPlaylistManager(id, {
    creatingPlaylist: container.creatingPlaylist,
    setCreatingPlaylistParent: container.setCreatingPlaylist,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
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
          isCreate={isCreate}
          playingPlaylist={playingPlaylist}
          creatingPlaylist={container.creatingPlaylist.value}
          setCreatingPlaylist={container.setCreatingPlaylist}
          playlist={playlist}
        />
      </div>
    </div>
  );
}
