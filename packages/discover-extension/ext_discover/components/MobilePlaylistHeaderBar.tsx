import { MobilePlaylistToggleButton } from "ext_discover.components.MobilePlaylistToggleButton";
import type { MobilePlaylistHeaderBarProps } from "ext_discover.interfaces.components.MobilePlaylistHeaderBar";

const G = globalThis as Record<string, any>;

export function MobilePlaylistHeaderBar({
  manager,
}: MobilePlaylistHeaderBarProps) {
  const isCurrentVisible = manager.isCurrentVisible.value;
  const currentPlaylistName = manager.currentPlaylistName.value;
  const nextItem = manager.nextItem.value;
  const currentItem = manager.currentItem.value;
  const parentId = manager.parentId.value;

  return (
    <div className="playlist-header" style={{ paddingLeft: "1rem" }}>
      <div className="playlist-header-left">
        <p className="playlist-header-title">{currentPlaylistName}</p>
        <div className="playlist-header-next-current">
          <p
            className={`playlist-header-next ${isCurrentVisible ? "hide" : ""}`}
          >
            {nextItem?.content ? "Next:" : "Playlist Ended"}{" "}
            <span className="playlist-header-next-item">
              {G.GetTruncatedPlaylistLabel(nextItem, 16)}
            </span>
          </p>
          <p
            className={`playlist-header-current ${isCurrentVisible ? "" : "hide"}`}
          >
            {currentItem?.content ? "Current:" : "Checklist Mode"}{" "}
            <span className="playlist-header-next-item">
              {G.GetTruncatedPlaylistLabel(currentItem, 9)}
            </span>
          </p>
        </div>
      </div>
      <div className="playlist-header-right">
        <MobilePlaylistToggleButton parentId={parentId} />
        <span
          className="material-symbols-outlined"
          onClick={() => G.StopPlayingPlaylistModal(true)}
        >
          close
        </span>
      </div>
    </div>
  );
}
