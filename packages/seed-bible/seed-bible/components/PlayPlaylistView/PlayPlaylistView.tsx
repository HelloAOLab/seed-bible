import "./PlayPlaylistView.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import {
  expandCrossChapterItem,
  type PlaylistItemData,
  type PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import { DiscoverSection } from "../DiscoverPane/DiscoverSection";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  playlistItemSubtitle,
  playlistItemKind,
} from "../playlistItemSubtitle";
import { useDragReorder } from "../useDragReorder";
import { MaterialIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { PlaylistItemNav } from "../PlaylistItemNav/PlaylistItemNav";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistPartyPanel } from "../PlaylistPartyPanel/PlaylistPartyPanel";
import { isLocalSessionHost } from "../Tabs/Tabs";

interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  state: SeedBibleState;
}

/**
 * The scene heading, if any, that starts at each queue position: the scenes
 * of the playlist the queue was built from, placed by counting the steps each
 * source item expands into. Empty when the queue no longer matches the
 * playlist (steps were added, removed or reordered during playback), since
 * the headings could then land on the wrong steps.
 */
export function queueSceneHeadings(
  items: PlaylistItemData[],
  queueLength: number
): Map<number, string> {
  const headings = new Map<number, string>();
  let cursor = 0;
  let pending: string | null = null;
  for (const item of items) {
    if (item.type === "scene") {
      pending = item.title;
      continue;
    }
    const count = expandCrossChapterItem(item).length;
    if (pending !== null && count > 0) {
      headings.set(cursor, pending);
      pending = null;
    }
    cursor += count;
  }
  return cursor === queueLength ? headings : new Map();
}

/**
 * Playback screen shown inside the discover pane while a playlist is playing:
 * the cover and author, a segmented progress bar, a card for the current step
 * with Previous / Next and what's up next (and the author's note, for a
 * passage that has one), and the numbered queue beneath it, grouped under
 * its scenes, with the steps already read ticked off. Video, link, text,
 * question and compare steps open in the app's generic modal rather than
 * rendering inline.
 */
export function PlayPlaylistView(props: PlayPlaylistViewProps) {
  const { playlists, tabs, state } = props;
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
  const currentItem = playing.currentItem.value;
  const nextItem = queue[currentIndex + 1] ?? null;
  const playlist = playing.playlists.value[0];
  const heroImageUrl = playlist?.heroImageUrl ?? null;
  const authorName = playlists.playingAuthorName.value;
  const description = playlist?.description?.trim() || null;
  const sceneHeadings = queueSceneHeadings(playlist?.items ?? [], queue.length);
  // A playlist playing in a shared session is a group reading it together.
  const session = playing.tab?.sharedSession ?? null;

  // Resolve verse book IDs to full book names using the selected tab's loaded
  // translation, when available. Falls back to the raw book ID otherwise.
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const currentNote =
    currentItem?.type === "bible-verse" &&
    (currentItem.note || currentItem.noteTitle)
      ? { title: currentItem.noteTitle?.trim() || null, html: currentItem.note }
      : null;

  return (
    <div className="sb-discover-pane sb-play-playlist">
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

        {queue.length > 0 ? (
          <div
            className="sb-play-progress"
            role="progressbar"
            aria-label={t("playlist-progress", {
              defaultValue: "Playlist progress",
            })}
            aria-valuemin={0}
            aria-valuemax={queue.length}
            aria-valuenow={Math.max(0, currentIndex + 1)}
            aria-valuetext={t("playlist-step-of", {
              defaultValue: "Step {{step}} of {{total}}",
              step: Math.max(0, currentIndex + 1),
              total: queue.length,
            })}
          >
            {queue.map((_, index) => (
              <span
                key={index}
                className={
                  "sb-play-progress-segment" +
                  (index <= currentIndex
                    ? " sb-play-progress-segment--reached"
                    : "")
                }
              />
            ))}
          </div>
        ) : null}

        {session && queue.length > 0 ? (
          <PlaylistPartyPanel
            session={session}
            playing={playing}
            isLeader={isLocalSessionHost(state, session)}
            resolveBookName={resolveBookName}
          />
        ) : null}

        {currentItem ? (
          <section
            className="sb-play-current"
            aria-label={t("current-step", { defaultValue: "Current step" })}
            dir="auto"
          >
            <p className="sb-play-current-eyebrow">
              {playlistItemKind(currentItem, t)}
              {" · "}
              {t("playlist-step-of", {
                defaultValue: "Step {{step}} of {{total}}",
                step: currentIndex + 1,
                total: queue.length,
              })}
            </p>
            {currentNote?.title ? (
              <>
                <p className="sb-play-current-reference">
                  {playlistItemLabel(currentItem, t, resolveBookName)}
                </p>
                <h3 className="sb-play-current-title">{currentNote.title}</h3>
              </>
            ) : (
              <h3 className="sb-play-current-title">
                {playlistItemLabel(currentItem, t, resolveBookName)}
              </h3>
            )}
            {currentNote?.html ? (
              <div className="sb-play-current-note">
                <PlaylistHtmlContent html={currentNote.html} />
              </div>
            ) : null}
            {currentItem.type !== "bible-verse" ? (
              <p className="sb-play-current-detail">
                {playlistItemSubtitle(currentItem, t, resolveBookName)}
              </p>
            ) : null}
            {nextItem ? (
              <p className="sb-play-current-up-next">
                {t("playlist-up-next", {
                  defaultValue: "Up next · {{kind}} · {{title}}",
                  kind: playlistItemKind(nextItem, t),
                  title: playlistItemLabel(nextItem, t, resolveBookName),
                })}
              </p>
            ) : null}
            <PlaylistItemNav playing={playing} />
          </section>
        ) : null}

        <DiscoverSection
          title={t("queue", { defaultValue: "Queue" })}
          count={queue.length || undefined}
        >
          <ul className="sb-discover-list">
            {queue.map((item, index) => {
              const isCurrent = index === currentIndex;
              const isDone = index < currentIndex;
              const heading = sceneHeadings.get(index);
              return (
                <li
                  key={index}
                  className={
                    "sb-discover-item sb-discover-item--row sb-play-playlist-item" +
                    (isCurrent ? " sb-play-playlist-item--current" : "") +
                    (isDone ? " sb-play-playlist-item--done" : "") +
                    getRowClassName(index)
                  }
                  dir="auto"
                >
                  {heading !== undefined ? (
                    <h4 className="sb-play-playlist-scene">{heading}</h4>
                  ) : null}
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
                    aria-current={isCurrent}
                    onClick={() => {
                      playing.jumpTo(index);
                    }}
                  >
                    <span
                      className="sb-play-playlist-item-number"
                      aria-hidden="true"
                    >
                      {isDone ? <MaterialIcon>check</MaterialIcon> : index + 1}
                    </span>
                    <span className="sb-play-playlist-item-text">
                      <span className="sb-discover-item-title">
                        {playlistItemLabel(item, t, resolveBookName)}
                      </span>
                      <span className="sb-play-playlist-item-subtitle">
                        {playlistItemSubtitle(item, t, resolveBookName)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DiscoverSection>
      </div>
    </div>
  );
}
