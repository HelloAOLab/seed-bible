import "./PlayPlaylistView.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { DiscoverSection } from "../DiscoverPane/DiscoverSection";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemIcon } from "../playlistItemIcon";
import { useDragReorder } from "../useDragReorder";
import { MaterialIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  state: SeedBibleState;
}

/**
 * Playback screen shown inside the discover pane while a playlist is playing.
 * Displays the playlist title, the queue of items, and a bottom-anchored bar
 * with the current item and previous/next controls. Video, link, and text
 * (html) items open in the app's generic modal rather than rendering inline.
 */
export function PlayPlaylistView(props: PlayPlaylistViewProps) {
  const { playlists, tabs } = props;
  const { t } = useI18n();

  // Reading `.value` during render subscribes the component to updates.
  const playing = playlists.playing.value;
  const queue = playing?.queue.value ?? [];

  // Called unconditionally (before the `!playing` early return below) so the
  // hook's own hooks aren't called conditionally across renders.
  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: queue.length,
    onReorder: (from, to) => playing?.reorderQueue(from, to),
  });

  if (!playing) {
    return null;
  }

  const currentIndex = playing.currentIndex.value;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  return (
    <div className="sb-discover-pane sb-play-playlist">
      <div className="sb-play-playlist-body">
        <DiscoverSection title={t("queue", { defaultValue: "Queue" })}>
          <ul className="sb-discover-list">
            {queue.map((item, index) => (
              <li
                key={index}
                className={
                  "sb-discover-item sb-discover-item--row sb-play-playlist-item" +
                  (index === currentIndex
                    ? " sb-play-playlist-item--current"
                    : "") +
                  getRowClassName(index)
                }
                dir="auto"
              >
                <button
                  type="button"
                  className="sb-discover-item-drag-handle"
                  aria-label={t("drag-to-reorder-playlist-item", {
                    defaultValue: "Drag to reorder",
                  })}
                  {...getHandleProps(index)}
                >
                  <MaterialIcon>drag_indicator</MaterialIcon>
                </button>
                <button
                  type="button"
                  className="sb-play-playlist-item-button"
                  aria-current={index === currentIndex}
                  onClick={() => {
                    playing.jumpTo(index);
                  }}
                >
                  <MaterialIcon className="sb-discover-item-icon">
                    {playlistItemIcon(item)}
                  </MaterialIcon>
                  <span className="sb-discover-item-title">
                    {playlistItemLabel(item, t, resolveBookName)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DiscoverSection>
      </div>
    </div>
  );
}
