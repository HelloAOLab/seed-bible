import { useI18n } from "../i18n/I18nManager";
import type { TabsManager } from "../managers/TabsManager";
import type { PlaylistManager } from "../managers/PlaylistManager";
import { MaterialIcon } from "./icons";
import { DiscoverSection } from "./DiscoverSection";
import { playlistItemLabel } from "./playlistItemLabel";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
}

/**
 * Playback screen shown inside the discover pane while a playlist is playing.
 * Displays the playlist title, the queue of items, and a bottom-anchored bar
 * with the current item and previous/next controls.
 */
export function PlayPlaylistView(props: PlayPlaylistViewProps) {
  const { playlists, tabs } = props;
  const { t } = useI18n();

  // Reading `.value` during render subscribes the component to updates.
  const playing = playlists.playing.value;
  if (!playing) {
    return null;
  }

  const queue = playing.queue.value;
  const currentIndex = playing.currentIndex.value;
  const currentItem = playing.currentItem.value;
  const sourcePlaylists = playing.playlists.value;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const title =
    sourcePlaylists[0]?.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

  return (
    <div className="sb-discover-pane sb-play-playlist">
      <div className="sb-discover-header">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.stopPlaying()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <h2 className="sb-discover-title" dir="auto">
          {title}
        </h2>
      </div>

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
                    : "")
                }
                dir="auto"
              >
                <button
                  type="button"
                  className="sb-play-playlist-item-button"
                  aria-current={index === currentIndex}
                  onClick={() => playing.jumpTo(index)}
                >
                  <span className="sb-discover-item-title">
                    {playlistItemLabel(item, t, resolveBookName)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DiscoverSection>
      </div>

      <div className="sb-play-controls">
        <span className="sb-play-controls-label" dir="auto">
          {currentItem
            ? playlistItemLabel(currentItem, t, resolveBookName)
            : t("now-playing", { defaultValue: "Now playing" })}
        </span>
        <div className="sb-play-controls-buttons">
          <button
            type="button"
            className="sb-play-controls-button"
            aria-label={t("previous", { defaultValue: "Previous" })}
            disabled={!playing.hasPrevious.value}
            onClick={() => playing.previous()}
          >
            <MaterialIcon>skip_previous</MaterialIcon>
          </button>
          <button
            type="button"
            className="sb-play-controls-button"
            aria-label={t("next", { defaultValue: "Next" })}
            disabled={!playing.hasNext.value}
            onClick={() => playing.next()}
          >
            <MaterialIcon>skip_next</MaterialIcon>
          </button>
        </div>
      </div>
    </div>
  );
}
