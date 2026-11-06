import "./PlayPlaylistView.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { useDragReorder } from "../useDragReorder";
import { MaterialIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { Spinner } from "../Spinner/Spinner";
import {
  PlaylistOverview,
  PlaylistOverviewItemContent,
} from "../PlaylistOverview/PlaylistOverview";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  state: SeedBibleState;
}

/**
 * The list of steps of the playlist that's playing, shown in the Discover
 * pane: the same overview as the playlist's own page, with each step opening
 * it, a drag handle to reorder it, and the current step highlighted. On a
 * phone, where this fills the screen, Continue Reading goes back to the step.
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
  const playlist = playing.playlists.value[0];

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
    <PlaylistOverview
      className="sb-play-playlist"
      title={
        playlist?.title ??
        t("untitled-playlist", { defaultValue: "Untitled playlist" })
      }
      backLabel={t("close-playlist", { defaultValue: "Close playlist" })}
      onBack={() => playlists.goBackFromPlayingView()}
      titleAccessory={
        playlists.openingPlayback.value ? <Spinner size="1rem" /> : null
      }
      heroImageUrl={playlist?.heroImageUrl ?? null}
      authorName={playlists.playingAuthorName.value}
      description={playlist?.description?.trim() || null}
      items={queue}
      // Only a phone needs this: the list fills its screen, hiding the
      // reader. Wider screens show the step beside the list already.
      action={
        playlists.isMobile.value && queue.length > 0
          ? {
              label: t("continue-reading", {
                defaultValue: "Continue Reading",
              }),
              onClick: () => playlists.openQueueItem(Math.max(currentIndex, 0)),
            }
          : null
      }
    >
      {queue.map((item, index) => (
        <li
          key={index}
          className={
            "sb-discover-item sb-discover-item--row sb-playlist-page-item sb-play-playlist-item" +
            (index === currentIndex ? " sb-play-playlist-item--current" : "") +
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
            onClick={() => playlists.openQueueItem(index)}
          >
            <PlaylistOverviewItemContent
              item={item}
              resolveBookName={resolveBookName}
            />
          </button>
        </li>
      ))}
    </PlaylistOverview>
  );
}
