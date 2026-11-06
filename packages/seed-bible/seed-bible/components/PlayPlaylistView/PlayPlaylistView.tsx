import "./PlayPlaylistView.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { DiscoverSection } from "../Discover/DiscoverSection";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemIcon } from "../playlistItemIcon";
import { PlaylistItemNoteTag } from "../PlaylistItemNoteTag/PlaylistItemNoteTag";
import { useDragReorder } from "../useDragReorder";
import { MaterialIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { DiscoverPanelLayout } from "../Discover/DiscoverPanelHeader";
import { Spinner } from "../Spinner/Spinner";
import { playlistTotalMinutes } from "../PlaylistEditor/playlistSteps";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  state: SeedBibleState;
}

/**
 * Back button, which leaves the playlist, plus the playing playlist's title,
 * for the view's header.
 */
function PlayPlaylistTitle(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t, isRtl } = useI18n();
  const title =
    playlists.playing.value?.playlists.value[0]?.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });

  return (
    <div className="sb-discover-title-row">
      <button
        type="button"
        className="sb-pane-header-button"
        aria-label={t("close-playlist", { defaultValue: "Close playlist" })}
        title={t("close-playlist", { defaultValue: "Close playlist" })}
        onClick={() => playlists.goBackFromPlayingView()}
      >
        <MaterialIcon>{isRtl ? "arrow_forward" : "arrow_back"}</MaterialIcon>
      </button>
      <span className="sb-discover-title" dir="auto">
        {title}
      </span>
      {playlists.openingPlayback.value ? <Spinner size="1rem" /> : null}
    </div>
  );
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
  const playlist = playing.playlists.value[0];
  const heroImageUrl = playlist?.heroImageUrl ?? null;
  const authorName = playlists.playingAuthorName.value;
  const description = playlist?.description?.trim() || null;

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
    <DiscoverPanelLayout
      title={<PlayPlaylistTitle playlists={playlists} />}
      bodyClassName="sb-play-playlist"
    >
      <div className="sb-play-playlist-body">
        {heroImageUrl ? (
          <HeroImageBanner
            url={heroImageUrl}
            alt={
              playing.playlists.value[0]?.title ??
              t("untitled-playlist", { defaultValue: "Untitled playlist" })
            }
          />
        ) : null}
        {authorName || description ? (
          <div className="sb-play-playlist-about" dir="auto">
            {authorName ? (
              <p className="sb-play-playlist-author">
                {t("shared-page-by-author", {
                  author: authorName,
                  defaultValue: "By {{author}}",
                })}
              </p>
            ) : null}
            {description ? (
              <ExpandableText
                className="sb-play-playlist-description"
                readMoreLabel={t("read-more", { defaultValue: "Read more" })}
                readLessLabel={t("read-less", { defaultValue: "Read less" })}
              >
                {description}
              </ExpandableText>
            ) : null}
          </div>
        ) : null}
        <DiscoverSection
          title={t("queue", { defaultValue: "Queue" })}
          detail={t("playlist-editor-step-count", {
            steps: queue.length,
            minutes: playlistTotalMinutes(queue),
            defaultValue: "{{steps}} steps · ~{{minutes}} min",
          })}
        >
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
                  onClick={() => playlists.openQueueItem(index)}
                >
                  <MaterialIcon className="sb-discover-item-icon">
                    {playlistItemIcon(item)}
                  </MaterialIcon>
                  <span className="sb-discover-item-title">
                    {playlistItemLabel(item, t, resolveBookName)}
                    <PlaylistItemNoteTag item={item} />
                  </span>
                  {item.minutes != null ? (
                    <span className="sb-play-playlist-item-minutes">
                      {t("playlist-editor-minutes", {
                        minutes: item.minutes,
                        defaultValue: "{{minutes}} min",
                      })}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </DiscoverSection>
      </div>
      {/* Only a phone needs this: the list fills its screen, hiding the
          reader. Wider screens show the step beside the list already. */}
      {playlists.isMobile.value && queue.length > 0 ? (
        <div className="sb-play-playlist-footer">
          <button
            type="button"
            className="sb-play-playlist-start"
            onClick={() => playlists.openQueueItem(Math.max(currentIndex, 0))}
          >
            {t("start-reading", { defaultValue: "Start Reading" })}
          </button>
        </div>
      ) : null}
    </DiscoverPanelLayout>
  );
}
