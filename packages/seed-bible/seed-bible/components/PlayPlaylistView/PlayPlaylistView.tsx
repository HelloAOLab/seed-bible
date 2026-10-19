import "./PlayPlaylistView.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import {
  expandCrossChapterItem,
  queueIndexOfStep,
  type PlaylistItemData,
  type PlaylistManager,
} from "../../managers/PlaylistManager";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { ModalManager } from "../../managers/ModalManager";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemIcon,
  playlistItemKind,
  playlistItemQueueLine,
  playlistItemSubtitle,
  playlistMinutes,
} from "../playlistItemSubtitle";
import { useDragReorder } from "../useDragReorder";
import { MaterialIcon } from "../icons";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
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
 * the cover, a segmented progress bar, a card for the current step with
 * Previous / Next step (and the author's note, for a passage that has one),
 * and the numbered queue beneath it with each step's kind and length,
 * grouped under its scenes, with the steps already read ticked off. The
 * playlist's own title and author sit in the pane header.
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
  const playlist = playing.playlists.value[0];
  const heroImageUrl = playlist?.heroImageUrl ?? null;
  const sceneHeadings = queueSceneHeadings(playlist?.items ?? [], queue.length);
  // A playlist playing in a shared session is a group reading it together.
  const session = playing.tab?.sharedSession ?? null;

  // Embedded passages in a note load in the playing tab's translation.
  const bibleData = state.bibleData;
  const loadChapter: ScriptureChapterLoader | undefined = bibleData
    ? async (translationId, bookId, chapter) => {
        const translation =
          translationId ?? playing.tab?.readingState.translationId.peek();
        if (!translation) {
          throw new Error("No translation to load the passage in.");
        }
        return bibleData.getTranslationBookChapter(
          translation,
          bookId,
          chapter
        );
      }
    : undefined;
  const jumpToStep = (step: number) => {
    const index = queueIndexOfStep(playlist?.items ?? [], step);
    if (index !== null) {
      void playing.jumpTo(index);
    }
  };

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
              <MaterialIcon>{playlistItemIcon(currentItem)}</MaterialIcon>
              {playlistItemKind(currentItem, t)}
              {" · "}
              {t("playlist-position-of", {
                defaultValue: "{{step}} of {{total}}",
                step: currentIndex + 1,
                total: queue.length,
              })}
            </p>
            <h3 className="sb-play-current-title">
              {currentNote?.title ??
                playlistItemLabel(currentItem, t, resolveBookName)}
            </h3>
            {currentNote?.html ? (
              <div className="sb-play-current-note">
                <PlaylistHtmlContent
                  html={currentNote.html}
                  onStepLink={jumpToStep}
                  loadChapter={loadChapter}
                />
              </div>
            ) : null}
            {currentItem.type !== "bible-verse" ? (
              <p className="sb-play-current-detail">
                {playlistItemSubtitle(currentItem, t, resolveBookName)}
              </p>
            ) : null}
            <PlaylistItemNav playing={playing} />
          </section>
        ) : null}

        <section
          className="sb-play-queue"
          aria-label={t("queue", { defaultValue: "Queue" })}
        >
          <h3 className="sb-play-queue-title">
            {t("playlist-queue-summary", {
              defaultValue: "Queue · {{count}} steps · ~{{minutes}}",
              count: queue.length,
              minutes: minutesLabel(playlistMinutes(queue), t),
            })}
          </h3>
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
                        {playlistItemQueueLine(item, t)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
