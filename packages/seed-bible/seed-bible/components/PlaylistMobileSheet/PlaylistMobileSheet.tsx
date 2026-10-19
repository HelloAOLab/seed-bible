import "./PlaylistMobileSheet.css";
import { useState } from "preact/hooks";
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
import { PlaylistItemNav } from "../PlaylistItemNav/PlaylistItemNav";
import { PlaylistPartyPanel } from "../PlaylistPartyPanel/PlaylistPartyPanel";
import { isLocalSessionHost } from "../Tabs/Tabs";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

/**
 * A playing scripture step on a phone: a sheet docked above the chapter
 * navigation, so the passage stays readable above it. Its handle folds it to one line
 * (the step's kind, the playlist and the step's title) or opens it to show
 * the note, what's up next, Previous / Next step, the Listen toggle, and the
 * group's state in a shared session.
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
  const [open, setOpen] = useState(true);
  const queue = playing.queue.value;
  const index = playing.currentIndex.value;
  const item = playing.currentItem.value;
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

  return (
    <section
      className={`sb-playlist-sheet${open ? " sb-playlist-sheet--open" : ""}`}
      aria-label={t("current-step", { defaultValue: "Current step" })}
      dir="auto"
    >
      <div className="sb-playlist-sheet-head">
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
          <span className="sb-playlist-sheet-grip" aria-hidden="true" />
          {open ? (
            <span className="sb-playlist-sheet-progress" aria-hidden="true">
              {segments}
            </span>
          ) : null}
          <span className="sb-playlist-sheet-eyebrow">
            <MaterialIcon>{playlistItemIcon(item)}</MaterialIcon>
            <span className="sb-playlist-sheet-eyebrow-text">
              {playlistItemKind(item, t)}
              {" · "}
              {playlist?.title ??
                t("untitled-playlist", { defaultValue: "Untitled playlist" })}
            </span>
          </span>
          {!open ? (
            <span className="sb-playlist-sheet-collapsed-title">{title}</span>
          ) : null}
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
      </div>
      {open ? (
        <div className="sb-playlist-sheet-body">
          <h3 className="sb-playlist-sheet-title">{title}</h3>
          {note?.html ? (
            <div className="sb-playlist-sheet-note">
              <PlaylistHtmlContent
                html={note.html}
                loadChapter={loadChapter}
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
          ) : (
            <PlaylistItemNav playing={playing} />
          )}
        </div>
      ) : null}
    </section>
  );
}
