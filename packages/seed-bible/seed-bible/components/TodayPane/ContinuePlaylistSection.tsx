import type { ReadonlySignal } from "@preact/signals";
import { useI18n } from "../../i18n";
import {
  isPlaylistPlayHistoryComplete,
  type PlaylistManager,
  type PlaylistPlayHistory,
} from "../../managers/PlaylistManager";
import { MaterialIcon } from "../icons";
import { playlistItemLabel } from "../playlistItemLabel";
import { playlistItemKind } from "../playlistItemSubtitle";

/**
 * The playlist to offer picking back up: the most recently played one that
 * wasn't finished. Null when every played playlist was finished, or none has
 * been played.
 */
export function unfinishedPlaylistToContinue(
  history: PlaylistPlayHistory[]
): PlaylistPlayHistory | null {
  let latest: PlaylistPlayHistory | null = null;
  for (const entry of history) {
    if (
      entry.totalSteps <= 0 ||
      entry.currentStep < 0 ||
      isPlaylistPlayHistoryComplete(entry)
    ) {
      continue;
    }
    if (!latest || entry.updatedAtMs > latest.updatedAtMs) {
      latest = entry;
    }
  }
  return latest;
}

/**
 * "Continue your playlist" on the Today screen: the playlist the reader left
 * part-way through, how far they got, the step they were on, and a Resume
 * button that picks playback up there. Renders nothing when there is no
 * unfinished playlist.
 */
export const ContinuePlaylistSection = (props: {
  playlists: Pick<PlaylistManager, "userPlaylistHistory">;
  /** Book names for the step being shown; the raw id stands in otherwise. */
  bookNames: ReadonlySignal<Map<string, string>>;
  onResume: (entry: PlaylistPlayHistory) => void;
}) => {
  const { t } = useI18n();
  const entry = unfinishedPlaylistToContinue(
    props.playlists.userPlaylistHistory.value
  );
  if (!entry) {
    return null;
  }

  const bookNames = props.bookNames.value;
  const resolveBookName = (bookId: string) => bookNames.get(bookId) ?? bookId;
  const step = entry.currentStep + 1;
  const title =
    entry.playlistTitle ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });
  const stepOf = t("playlist-step-of", {
    defaultValue: "Step {{step}} of {{total}}",
    step,
    total: entry.totalSteps,
  });

  return (
    <section
      className="sb-today-continue-card"
      aria-label={t("continue-your-playlist", {
        defaultValue: "Continue your playlist",
      })}
      dir="auto"
    >
      <span className="sb-today-continue-eyebrow">
        <MaterialIcon>playlist_play</MaterialIcon>
        {t("continue-your-playlist", {
          defaultValue: "Continue your playlist",
        })}
      </span>
      <h2 className="sb-today-continue-title">{title}</h2>
      <div
        className="sb-today-continue-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={entry.totalSteps}
        aria-valuenow={step}
        aria-valuetext={stepOf}
      >
        {Array.from({ length: entry.totalSteps }, (_, index) => (
          <span
            key={index}
            className={
              "sb-today-continue-segment" +
              (index <= entry.currentStep
                ? " sb-today-continue-segment--reached"
                : "")
            }
          />
        ))}
      </div>
      {entry.lastItem ? (
        <div className="sb-today-continue-step">
          <span className="sb-today-continue-step-title">
            {playlistItemLabel(entry.lastItem, t, resolveBookName)}
          </span>
          <span className="sb-today-continue-step-meta">
            {stepOf} · {playlistItemKind(entry.lastItem, t)}
          </span>
        </div>
      ) : (
        <p className="sb-today-continue-step-meta">{stepOf}</p>
      )}
      <button
        type="button"
        className="sb-today-continue-resume sb-today-clickable"
        onClick={() => props.onResume(entry)}
      >
        {t("resume", { defaultValue: "Resume" })}
        <MaterialIcon>arrow_right_alt</MaterialIcon>
      </button>
    </section>
  );
};
