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
  playlistItemKind,
  playlistItemSubtitle,
} from "../playlistItemSubtitle";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistItemNav } from "../PlaylistItemNav/PlaylistItemNav";
import { PlaylistPartyPanel } from "../PlaylistPartyPanel/PlaylistPartyPanel";
import { isLocalSessionHost } from "../Tabs/Tabs";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

/**
 * The playing step on a phone: a sheet docked above the chapter navigation,
 * so the passage stays readable above it. Its handle folds it to one line
 * (the step's kind, position and title) or opens it to show the note, what's
 * up next, Previous / Next step, the Listen toggle, and the group's state in
 * a shared session.
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
  if (!item) {
    return null;
  }
  const nextItem = queue[index + 1] ?? null;
  const playlist = playing.playlists.value[0];
  const session = playing.tab?.sharedSession ?? null;
  const note =
    item.type === "bible-verse" && (item.note || item.noteTitle)
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
      <button
        type="button"
        className="sb-playlist-sheet-handle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sb-playlist-sheet-grip" aria-hidden="true" />
        <span className="sb-playlist-sheet-eyebrow">
          {playlistItemKind(item, t)}
          {" · "}
          {t("playlist-step-of", {
            defaultValue: "Step {{step}} of {{total}}",
            step: index + 1,
            total: queue.length,
          })}
        </span>
        {!open ? (
          <span className="sb-playlist-sheet-collapsed-title">{title}</span>
        ) : null}
        <MaterialIcon className="sb-playlist-sheet-caret">
          {open ? "expand_more" : "expand_less"}
        </MaterialIcon>
      </button>
      {open ? (
        <div className="sb-playlist-sheet-body">
          <div className="sb-playlist-sheet-progress" aria-hidden="true">
            {segments}
          </div>
          {note?.title ? (
            <p className="sb-playlist-sheet-reference">
              {playlistItemLabel(item, t, resolveBookName)}
            </p>
          ) : null}
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
          ) : item.type !== "bible-verse" ? (
            <p className="sb-playlist-sheet-detail">
              {playlistItemSubtitle(item, t, resolveBookName)}
            </p>
          ) : null}
          {nextItem ? (
            <p className="sb-playlist-sheet-up-next">
              {t("playlist-up-next", {
                defaultValue: "Up next · {{kind}} · {{title}}",
                kind: playlistItemKind(nextItem, t),
                title: playlistItemLabel(nextItem, t, resolveBookName),
              })}
            </p>
          ) : null}
          <div className="sb-playlist-sheet-actions">
            {canListen ? (
              <button
                type="button"
                className={`sb-playlist-sheet-listen${
                  listening ? " sb-playlist-sheet-listen--on" : ""
                }`}
                aria-pressed={listening}
                onClick={() => playing.setListenAlong(!listening)}
              >
                <MaterialIcon>
                  {listening ? "headphones" : "headphones"}
                </MaterialIcon>
                {listening
                  ? t("playlist-listening", { defaultValue: "Listening" })
                  : t("playlist-listen", { defaultValue: "Listen" })}
              </button>
            ) : null}
            <PlaylistItemNav playing={playing} />
          </div>
          {session ? (
            <PlaylistPartyPanel
              session={session}
              playing={playing}
              isLeader={isLocalSessionHost(state, session)}
              resolveBookName={resolveBookName}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
