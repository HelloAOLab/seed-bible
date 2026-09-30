import "../DiscoverPane/DiscoverPane.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type {
  Playlist,
  PlaylistPlayHistory,
} from "../../managers/PlaylistManager";
import {
  groupPlaylistPlayHistoryByDay,
  isPlaylistPlayHistoryComplete,
  playlistPlayHistoryDayKind,
  playlistPlayHistoryPercent,
} from "../../managers/PlaylistManager";
import { playlistItemLabel } from "../playlistItemLabel";
import { HeroImageThumb } from "../HeroImageField/HeroImageField";
import { MaterialIcon } from "../icons";
import { Spinner } from "../Spinner/Spinner";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import "./PlaylistHistoryPane.css";

export const PLAYLIST_HISTORY_PANE_ID = "playlist-history-pane";

export interface PlaylistHistoryPaneProps {
  state: SeedBibleState;
  /**
   * Closes this screen once playback has started, so the reader is what the
   * user lands on. Not called when the playlist cannot be opened.
   */
  onLeave: () => void;
}

/** Pane header title. A component so it can call `useI18n`. */
export function PlaylistHistoryPaneTitle() {
  const { t } = useI18n();
  return (
    <>{t("my-playlist-history", { defaultValue: "My playlist history" })}</>
  );
}

function playlistTitle(
  entry: PlaylistPlayHistory,
  t: ReturnType<typeof useI18n>["t"]
): string {
  return (
    entry.playlistTitle ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" })
  );
}

function formatHistoryDayLabel(
  dayKey: string,
  language: string,
  t: ReturnType<typeof useI18n>["t"],
  nowMs: number = Date.now()
): string {
  const kind = playlistPlayHistoryDayKind(dayKey, nowMs);
  if (kind === "today") {
    return t("today", { defaultValue: "Today" });
  }
  if (kind === "yesterday") {
    return t("yesterday", { defaultValue: "Yesterday" });
  }
  const [year, month, day] = dayKey.split("-").map(Number);
  if (year == null || month == null || day == null) {
    return dayKey;
  }
  return new Date(year, month - 1, day).toLocaleDateString(language, {
    dateStyle: "medium",
  });
}

const historySessionTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatHistorySessionTime(
  startedAtMs: number,
  language: string
): string {
  let formatter = historySessionTimeFormatterCache.get(language);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, { timeStyle: "short" });
    historySessionTimeFormatterCache.set(language, formatter);
  }
  return formatter.format(new Date(startedAtMs));
}

/**
 * Playlist history, reached from the Profile screen. Sessions are grouped by
 * day. Play continues or replays a session, and a menu drops one.
 */
export function PlaylistHistoryPane(props: PlaylistHistoryPaneProps) {
  const { state, onLeave } = props;
  const { t } = useI18n();
  const { playlists, tabs } = state;
  const history = playlists.userPlaylistHistory.value;
  const userPlaylists = playlists.userPlaylists.value;
  const openingId = useSignal<string | null>(null);

  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const playFromHistory = (entry: PlaylistPlayHistory): void => {
    if (openingId.peek()) {
      return;
    }
    openingId.value = entry.id;
    const action = isPlaylistPlayHistoryComplete(entry)
      ? playlists.replayFromHistory(entry)
      : playlists.continueFromHistory(entry);
    void action.then(
      () => {
        openingId.value = null;
        onLeave();
      },
      () => {
        openingId.value = null;
        state.app.toast(
          t("playlist-history-open-failed", {
            defaultValue:
              "Couldn't open that playlist. It may have been deleted.",
          })
        );
      }
    );
  };

  return (
    <div className="sb-playlist-history-screen">
      <div className="sb-playlist-history-inner">
        {history.length === 0 ? (
          <p className="sb-playlist-history-empty">
            {t("playlist-history-empty", {
              defaultValue: "Playlists you listen to will show up here.",
            })}
          </p>
        ) : (
          <PlaylistHistoryList
            history={history}
            userPlaylists={userPlaylists}
            resolveBookName={resolveBookName}
            onPlay={playFromHistory}
            openingId={openingId.value}
            onRemove={(entry) => void playlists.removePlayHistory(entry)}
          />
        )}
      </div>
    </div>
  );
}

function PlaylistHistoryList(props: {
  history: PlaylistPlayHistory[];
  userPlaylists: Playlist[];
  resolveBookName: (bookId: string) => string;
  onPlay: (entry: PlaylistPlayHistory) => void;
  openingId: string | null;
  onRemove: (entry: PlaylistPlayHistory) => void;
}) {
  const { t, language } = useI18n();
  const dayGroups = groupPlaylistPlayHistoryByDay(props.history);

  return (
    <>
      {dayGroups.map((group) => (
        <div key={group.dayKey} className="sb-playlist-history-day-group">
          <h2 className="sb-playlist-history-day">
            {formatHistoryDayLabel(group.dayKey, language, t)}
          </h2>
          <ul className="sb-discover-list">
            {group.entries.map((entry) => {
              const percent = Math.round(
                playlistPlayHistoryPercent(entry) * 100
              );
              const complete = isPlaylistPlayHistoryComplete(entry);
              const lastLabel = entry.lastItem
                ? playlistItemLabel(entry.lastItem, t, props.resolveBookName)
                : null;
              const sessionTime = formatHistorySessionTime(
                entry.startedAtMs,
                language
              );
              const summary = lastLabel
                ? t("playlist-history-session-summary", {
                    defaultValue: "{{time}} - {{percent}}% complete - {{item}}",
                    time: sessionTime,
                    percent,
                    item: lastLabel,
                  })
                : t("playlist-history-session-summary-no-item", {
                    defaultValue: "{{time}} - {{percent}}% complete",
                    time: sessionTime,
                    percent,
                  });

              const live = props.userPlaylists.find(
                (p) =>
                  p.id === entry.playlistId &&
                  p.recordName === entry.playlistRecordName
              );
              const heroUrl =
                live?.heroImageUrl ?? entry.playlistHeroImageUrl ?? null;

              const opening = props.openingId === entry.id;

              return (
                <li
                  key={entry.id}
                  className="sb-discover-item sb-discover-item--row sb-playlist-item sb-playlist-history-item"
                  dir="auto"
                  aria-busy={opening}
                  onClick={() => props.onPlay(entry)}
                >
                  {heroUrl ? <HeroImageThumb url={heroUrl} /> : null}
                  <div className="sb-discover-item-main">
                    <span className="sb-discover-item-title">
                      {playlistTitle(entry, t)}
                    </span>
                    <span className="sb-discover-item-description">
                      {summary}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sb-discover-item-play"
                    aria-label={
                      complete
                        ? t("playlist-history-replay", {
                            defaultValue: "Replay",
                          })
                        : t("playlist-history-continue", {
                            defaultValue: "Continue",
                          })
                    }
                    aria-busy={opening}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onPlay(entry);
                    }}
                  >
                    {opening ? (
                      <Spinner size="0.875rem" />
                    ) : (
                      <MaterialIcon>play_arrow</MaterialIcon>
                    )}
                  </button>
                  <ContextMenuWithButton
                    buttonClassName="sb-discover-item-menu"
                    aria-label={t("playlist-history-options", {
                      defaultValue: "Playlist history options",
                    })}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ContextMenuItem
                      className="sb-context-menu-item--danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onRemove(entry);
                      }}
                    >
                      <MaterialIcon className="sb-context-menu-item-icon">
                        delete
                      </MaterialIcon>
                      {t("playlist-history-remove", {
                        defaultValue: "Remove from history",
                      })}
                    </ContextMenuItem>
                  </ContextMenuWithButton>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
