import "./PlaylistMobileSheet.css";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import {
  queueIndexOfStep,
  type PlayingState,
} from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import {
  minutesLabel,
  playlistItemIcon,
  playlistItemKind,
  playlistItemMinutes,
} from "../playlistItemSubtitle";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistPartyPanel } from "../PlaylistPartyPanel/PlaylistPartyPanel";
import { isLocalSessionHost } from "../Tabs/Tabs";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

/**
 * A playing scripture step on a phone: a slim bar docked above the chapter
 * navigation, so the passage stays the thing being read. The bar holds the
 * step's title and place, Previous / Next (always within reach, open or
 * folded) and Listen. Tapping the title opens the author's note, what's up
 * next and, in a shared session, the group's state above it. A step with a
 * note starts open; a bare passage starts as just the bar.
 */
export function PlaylistMobileSheet(props: {
  playing: PlayingState;
  state: SeedBibleState;
  resolveBookName: (bookId: string) => string;
  /** Loads chapters for passages embedded in the step's note. */
  loadChapter?: ScriptureChapterLoader;
  /** Whether narration can be started for the step; hides Listen otherwise. */
  canListen?: boolean;
}) {
  const { playing, state, resolveBookName, loadChapter, canListen } = props;
  const { t } = useI18n();
  const queue = playing.queue.value;
  const index = playing.currentIndex.value;
  const item = playing.currentItem.value;
  const hasNote =
    item?.type === "bible-verse" && !!(item.note || item.noteTitle);
  const [open, setOpen] = useState(hasNote);
  // Each step opens on its note, if it has one, and folds to the bar if not.
  useEffect(() => {
    setOpen(hasNote);
  }, [index, hasNote]);
  // Other kinds of step fill the screen with their own Previous / Next.
  if (!item || item.type !== "bible-verse") {
    return null;
  }
  const nextItem = queue[index + 1] ?? null;
  const playlist = playing.playlists.value[0];
  const session = playing.tab?.sharedSession ?? null;
  const note =
    item.note || item.noteTitle
      ? { title: item.noteTitle?.trim() || null, html: item.note }
      : null;
  const title = note?.title ?? playlistItemLabel(item, t, resolveBookName);
  const listening = playing.listenAlong.value;

  const segments = queue.map((_, i) => (
    <span
      key={i}
      className={
        "sb-playlist-sheet-segment" +
        (i <= index ? " sb-playlist-sheet-segment--reached" : "")
      }
    />
  ));

  // In a session the leader moves everyone; the others say they're ready.
  const canStep = !session || isLocalSessionHost(state, session);
  const hasNext = playing.hasNext.value;

  return (
    <section
      className={`sb-playlist-sheet${open ? " sb-playlist-sheet--open" : ""}`}
      aria-label={t("current-step", { defaultValue: "Current step" })}
      dir="auto"
    >
      <span className="sb-playlist-sheet-progress" aria-hidden="true">
        {segments}
      </span>
      {open ? (
        <div className="sb-playlist-sheet-body">
          {note?.html ? (
            <div className="sb-playlist-sheet-note">
              <PlaylistHtmlContent
                html={note.html}
                loadChapter={loadChapter}
                onVerseLink={(verse) => {
                  const readingState = playing.tab?.readingState;
                  if (readingState) {
                    readingState.scrollToVerse.value = verse;
                  }
                }}
                onStepLink={(step) => {
                  const target = queueIndexOfStep(playlist?.items ?? [], step);
                  if (target !== null) {
                    void playing.jumpTo(target);
                  }
                }}
              />
            </div>
          ) : null}
          {nextItem ? (
            <p className="sb-playlist-sheet-up-next">
              {t("playlist-up-next-minutes", {
                defaultValue: "Up next · {{kind}} · {{title}} · {{minutes}}",
                kind: playlistItemKind(nextItem, t),
                title: playlistItemLabel(nextItem, t, resolveBookName),
                minutes: minutesLabel(playlistItemMinutes(nextItem), t),
              })}
            </p>
          ) : null}
          {session ? (
            <PlaylistPartyPanel
              session={session}
              playing={playing}
              isLeader={isLocalSessionHost(state, session)}
              resolveBookName={resolveBookName}
              compact
              onOpenChat={() => state.sidebar?.openChatPanel()}
            />
          ) : null}
        </div>
      ) : null}
      <div className="sb-playlist-sheet-bar">
        {canStep ? (
          <button
            type="button"
            className="sb-playlist-sheet-step"
            aria-label={t("previous", { defaultValue: "Previous" })}
            disabled={!playing.hasPrevious.value}
            onClick={() => void playing.previous()}
          >
            <MaterialIcon>chevron_left</MaterialIcon>
          </button>
        ) : null}
        <button
          type="button"
          className="sb-playlist-sheet-handle"
          aria-expanded={open}
          aria-label={
            open
              ? t("playlist-sheet-fold", { defaultValue: "Fold the step away" })
              : t("playlist-sheet-open", { defaultValue: "Show the step" })
          }
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sb-playlist-sheet-bar-text">
            <span className="sb-playlist-sheet-bar-title">{title}</span>
            <span className="sb-playlist-sheet-bar-meta">
              <MaterialIcon>{playlistItemIcon(item)}</MaterialIcon>
              {t("playlist-sheet-place", {
                defaultValue: "Step {{step}} of {{total}} · {{playlist}}",
                step: index + 1,
                total: queue.length,
                playlist:
                  playlist?.title ??
                  t("untitled-playlist", {
                    defaultValue: "Untitled playlist",
                  }),
              })}
            </span>
          </span>
          <MaterialIcon className="sb-playlist-sheet-chevron">
            {open ? "expand_more" : "expand_less"}
          </MaterialIcon>
        </button>
        {canListen ? (
          <button
            type="button"
            className={`sb-playlist-sheet-listen${
              listening ? " sb-playlist-sheet-listen--on" : ""
            }`}
            aria-pressed={listening}
            aria-label={
              listening
                ? t("playlist-listening", { defaultValue: "Listening" })
                : t("playlist-listen", { defaultValue: "Listen" })
            }
            onClick={() => playing.setListenAlong(!listening)}
          >
            <MaterialIcon>headphones</MaterialIcon>
          </button>
        ) : null}
        {canStep ? (
          <button
            type="button"
            className="sb-playlist-sheet-step sb-playlist-sheet-step--next"
            aria-label={
              hasNext
                ? t("playlist-next-step-button", { defaultValue: "Next step" })
                : t("finish", { defaultValue: "Finish" })
            }
            disabled={!playing.canPressNext.value}
            onClick={() => void playing.next()}
          >
            <MaterialIcon>{hasNext ? "chevron_right" : "check"}</MaterialIcon>
          </button>
        ) : null}
      </div>
    </section>
  );
}
