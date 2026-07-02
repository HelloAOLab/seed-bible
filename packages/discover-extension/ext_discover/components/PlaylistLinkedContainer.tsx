import { PlaylistRowItem } from "ext_discover.components.PlaylistRowItem";
import type { PlaylistLinkedContainerProps } from "ext_discover.interfaces.components.PlaylistLinkedContainer";

export function PlaylistLinkedContainer({
  playlist,
  linkingMode = true,
  clickPass,
}: PlaylistLinkedContainerProps) {
  return (
    <PlaylistRowItem
      viewOnly={true}
      linkingMode={linkingMode}
      parentId={playlist.parentId}
      playingPlaylist={false}
      handleDragStart={() => {}}
      setOpenedList={() => {}}
      opendedList={playlist.id}
      clickPass={clickPass}
      handleDragOver={() => {}}
      handleDragEnd={() => {}}
      dragOverSet={() => {}}
      id={playlist.id}
      name={playlist.name}
      list={playlist.list}
    />
  );
}
