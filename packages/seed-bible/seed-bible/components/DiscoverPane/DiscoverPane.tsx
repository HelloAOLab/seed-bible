import "./DiscoverPane.css";
import "./DiscoverShared.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type {
  Playlist,
  PlaylistManager,
  PlaylistPlayHistory,
} from "../../managers/PlaylistManager";
import {
  groupPlaylistPlayHistoryByDay,
  isPlaylistPlayHistoryComplete,
  playlistPlayHistoryDayKind,
  playlistPlayHistoryPercent,
} from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import { translateTitle } from "../../app/utils";
import { v4 as uuid } from "uuid";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import {
  CreatePlaylistForm,
  requestCancelPlaylistEditor,
} from "../CreatePlaylistForm/CreatePlaylistForm";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import { playlistItemLabel } from "../playlistItemLabel";
import { HeroImageThumb } from "../HeroImageField/HeroImageField";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
} from "./DiscoveredResultsSections";
import {
  AnnotationsSection,
  annotationLocationLabel,
} from "./AnnotationsSection";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}

/**
 * Header actions rendered in the pane's `PaneHeader` slot (see how the Discover
 * side pane is opened in `SeedBibleStateManager`). Only the discover sub-view
 * offers "create", so the button hides itself during the create/play
 * sub-views. Reads the `actualView` signal, so it stays reactive and resets
 * alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneHeader(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
}) {
  const { playlists, annotations } = props;
  const { t } = useI18n();

  if (playlists.actualView.value !== "discover") {
    return null;
  }

  return (
    <ContextMenuWithButton
      buttonClassName="sb-discover-create"
      aria-label={t("create-menu", { defaultValue: "Create" })}
      icon={<>+ {t("create-playlist", { defaultValue: "Create" })}</>}
    >
      <ContextMenuItem onClick={() => void annotations.createNewAnnotation()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          edit_note
        </MaterialIcon>
        {t("create-annotation-menu-item", { defaultValue: "Annotation" })}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => void playlists.createNewPlaylist()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          queue_music
        </MaterialIcon>
        {t("create-playlist-menu-item", { defaultValue: "Playlist" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

/**
 * Title rendered in the pane's `PaneHeader` (passed as the pane's `title`
 * render function, see `SeedBibleStateManager`). In the discover sub-view it's
 * just the "Discover" label; while viewing or editing a playlist it becomes a
 * back button plus the playlist title (an editable input when editing), so
 * those controls live in the pane header rather than below it. Reads the
 * `actualView`/`playing`/`editingPlaylist` signals, so it stays reactive and
 * resets alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneTitle(props: {
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  tabs: TabsManager;
  chats: ChatsManager;
  openChatPanel: () => void;
  modals?: ModalManager;
}) {
  const { playlists, annotations, tabs, chats, openChatPanel } = props;
  const { t } = useI18n();
  const view = playlists.actualView.value;

  if (view === "create_annotation") {
    const editing = annotations.editingAnnotation.value;
    const location = editing ? annotationLocationLabel(editing, tabs) : null;
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => annotations.cancelEditingAnnotation()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {t("annotate-title", {
            location: location ?? "",
            defaultValue: "Annotate {{location}}",
          })}
        </span>
      </div>
    );
  }

  if (view === "play_playlist") {
    const playing = playlists.playing.value;
    const title =
      playing?.playlists.value[0]?.title ??
      t("untitled-playlist", { defaultValue: "Untitled playlist" });
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.goBackFromPlayingView()}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <span className="sb-discover-title" dir="auto">
          {title}
        </span>
      </div>
    );
  }

  if (view === "create_playlist") {
    const editing = playlists.editingPlaylist.value;
    const providers = chats.providers.value.filter(
      (p) => p.supportsToolCalling
    );
    // Opens the chat panel on a fresh local chat, seeded with an anonymous
    // prompt message inviting the user to describe what they want changed,
    // with the given AI provider (if any) already added as a participant.
    // `PlaylistManager` already exposes the playlist-editing tools to every
    // chat while a playlist is being edited, so replying here lets the AI
    // add/update/remove items and edit the title/description.
    const startAiChat = (providerId: string | null) => {
      let chat = chats.chats.value.find(
        (c) =>
          c.participants.value.every((p) => !p.isRemote) &&
          c.participants.value.some(
            (p) => p.isAI && p.providerId === providerId
          )
      );
      if (!chat) {
        chat = chats.createLocalSession({
          messages: [
            {
              id: uuid(),
              authors: providerId ? [providerId] : [],
              timeMs: Date.now(),
              targets: [],
              type: "text",
              text: t("ai-playlist-chat-prompt", {
                defaultValue: "What do you want to add/change?",
              }),
            },
          ],
          providerIds: [],
        });
      }
      if (providerId) {
        chat.addParticipant(providerId);
      }
      chats.selectChat(chat.id);
      openChatPanel();
    };
    const aiButtonLabel = t("ai", { defaultValue: "AI" });
    const aiButtonAriaLabel = t("ai-edit-playlist", {
      defaultValue: "Edit playlist with AI",
    });
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => {
            if (props.modals) {
              requestCancelPlaylistEditor(playlists, props.modals);
              return;
            }
            playlists.cancelEditingPlaylist();
          }}
        >
          <MaterialIcon>arrow_back</MaterialIcon>
        </button>
        <input
          className="sb-settings-text-input sb-playlist-input"
          type="text"
          value={editing?.title ?? ""}
          dir="auto"
          onInput={(event: Event) => {
            const value = (event.currentTarget as HTMLInputElement).value;
            playlists.updateEditingPlaylistMetadata({
              title: value.trim() ? value : null,
            });
          }}
          placeholder={t("playlist-title_placeholder", {
            defaultValue: "Playlist title",
          })}
        />
        {providers.length > 1 ? (
          // Multiple providers: let the user pick which one starts the chat.
          <ContextMenuWithButton
            buttonClassName="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            icon={
              <>
                <MaterialIcon>auto_awesome</MaterialIcon>
              </>
            }
          >
            {providers.map((provider) => (
              <ContextMenuItem
                key={provider.id}
                onClick={() => startAiChat(provider.id)}
              >
                {translateTitle(t, provider.name)}
              </ContextMenuItem>
            ))}
          </ContextMenuWithButton>
        ) : (
          // Zero or one provider: no choice to make, so skip the menu. A
          // single provider is added automatically; with none, the chat opens
          // with just the prompt message.
          <button
            type="button"
            className="sb-discover-title-ai"
            aria-label={aiButtonAriaLabel}
            title={aiButtonLabel}
            onClick={() => startAiChat(providers[0]?.id ?? null)}
          >
            <MaterialIcon>auto_awesome</MaterialIcon>
          </button>
        )}
      </div>
    );
  }

  return <>{t("discover", { defaultValue: "Discover" })}</>;
}

/**
 * Pane content for the "Discover" tool. Shows the user's authored playlists and
 * annotations plus discovered cross references, study notes, and content for
 * the currently selected reader tab.
 *
 * Rendered inside the managed side pane (`SidePane`), so the pane shell supplies
 * the surrounding chrome — the title/close (`PaneHeader`), the docking layout,
 * and the mobile-fullscreen behavior. This component just renders the content.
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists, annotations, modals } = props;
  const { actualView } = playlists;

  if (actualView.value === "create_playlist") {
    return (
      <CreatePlaylistForm
        playlists={playlists}
        tabs={tabs}
        modals={modals}
        os={props.state.os}
        login={props.state.login}
        gallery={props.state.gallery}
      />
    );
  }

  if (actualView.value === "create_annotation") {
    return <CreateAnnotationForm annotations={annotations} tabs={tabs} />;
  }

  if (actualView.value === "play_playlist") {
    return (
      <PlayPlaylistView
        state={props.state}
        playlists={playlists}
        tabs={tabs}
        modals={modals}
      />
    );
  }

  // Reading `.value` during render subscribes the component to updates.
  const userPlaylists = playlists.userPlaylists.value;
  const playlistHistory = playlists.userPlaylistHistory.value;
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;

  return (
    <div className="sb-discover-pane">
      <PlaylistSection
        userPlaylists={userPlaylists}
        playlists={playlists}
        modals={modals}
        toast={props.toast}
      />

      <PlaylistHistorySection
        history={playlistHistory}
        userPlaylists={userPlaylists}
        playlists={playlists}
        tabs={tabs}
        toast={props.toast}
      />

      <AnnotationsSection
        tab={selectedTab}
        annotations={annotations}
        modals={modals}
        toast={props.toast}
        login={props.state.login}
        tabs={tabs}
        discover={props.state.discover}
        panes={props.state.panes}
        onReferenceClick={props.state.app.openVerseReference}
      />

      <CrossReferencesSection tab={selectedTab} />
      <StudyNotesSection tab={selectedTab} />
      <ContentSection tab={selectedTab} />
    </div>
  );
}

function PlaylistSection({
  userPlaylists,
  playlists,
  modals,
  toast,
}: {
  userPlaylists: Playlist[];
  playlists: PlaylistManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { t } = useI18n();
  return (
    <DiscoverSection title={t("playlists", { defaultValue: "Playlists" })}>
      {userPlaylists.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-playlists-empty", {
            defaultValue: "You haven't created any playlists yet.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {userPlaylists.map((playlist) => (
            <li
              key={playlist.id}
              className="sb-discover-item sb-discover-item--row sb-playlist-item"
              dir="auto"
              onClick={() => playlists.startPlaying(playlist)}
            >
              <HeroImageThumb url={playlist.heroImageUrl} />
              <div className="sb-discover-item-main">
                <span className="sb-discover-item-title">
                  {playlist.title ??
                    t("untitled-playlist", {
                      defaultValue: "Untitled playlist",
                    })}
                </span>
                {playlist.description ? (
                  <ExpandableText
                    className="sb-discover-item-description"
                    readMoreLabel={t("read-more", {
                      defaultValue: "Read more",
                    })}
                    readLessLabel={t("read-less", {
                      defaultValue: "Read less",
                    })}
                  >
                    {playlist.description}
                  </ExpandableText>
                ) : null}
              </div>
              <button
                type="button"
                className="sb-discover-item-play"
                aria-label={t("play-playlist", {
                  defaultValue: "Play playlist",
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  playlists.startPlaying(playlist);
                }}
              >
                <MaterialIcon>play_arrow</MaterialIcon>
              </button>
              <ContextMenuWithButton
                buttonClassName="sb-discover-item-menu"
                aria-label={t("playlist-options", {
                  defaultValue: "Playlist options",
                })}
                onClick={(e) => e.stopPropagation()}
              >
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = playlists.getPlaylistUrl(playlist);
                    navigator.clipboard.writeText(url);
                    toast(
                      t("playlist-url-copied", {
                        defaultValue: "Playlist URL copied to clipboard",
                      })
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    share
                  </MaterialIcon>
                  {t("share-playlist", { defaultValue: "Share playlist" })}
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    playlists.editPlaylist(playlist);
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit-playlist", { defaultValue: "Edit playlist" })}
                </ContextMenuItem>
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeletePlaylistConfirm(
                      modals,
                      playlists,
                      playlist,
                      toast
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-playlist", { defaultValue: "Delete" })}
                </ContextMenuItem>
              </ContextMenuWithButton>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

/**
 * Recently played playlists (including shared ones), one row per playlist.
 * Play resumes or restarts, and a menu removes the playlist from history.
 */
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

function playFromHistory(
  playlists: PlaylistManager,
  entry: PlaylistPlayHistory,
  toast: SeedBibleState["app"]["toast"],
  t: ReturnType<typeof useI18n>["t"]
): void {
  const action = isPlaylistPlayHistoryComplete(entry)
    ? playlists.replayFromHistory(entry)
    : playlists.continueFromHistory(entry);
  void action.catch(() => {
    toast(
      t("playlist-history-open-failed", {
        defaultValue: "Couldn't open that playlist. It may have been deleted.",
      })
    );
  });
}

function PlaylistHistorySection({
  history,
  userPlaylists,
  playlists,
  tabs,
  toast,
}: {
  history: PlaylistPlayHistory[];
  userPlaylists: Playlist[];
  playlists: PlaylistManager;
  tabs: TabsManager;
  toast: SeedBibleState["app"]["toast"];
}) {
  const { t, language } = useI18n();
  const dayGroups = groupPlaylistPlayHistoryByDay(history);

  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const books = selectedTab?.readingState.translationBooks.value?.books ?? [];
  const resolveBookName = (bookId: string): string => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  return (
    <DiscoverSection
      title={t("playlist-history", { defaultValue: "Playlist history" })}
    >
      {history.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-playlist-history-empty", {
            defaultValue:
              "Play a saved playlist while signed in and it will show up here.",
          })}
        />
      ) : (
        dayGroups.map((group) => (
          <div key={group.dayKey} className="sb-playlist-history-day-group">
            <h4 className="sb-playlist-history-day">
              {formatHistoryDayLabel(group.dayKey, language, t)}
            </h4>
            <ul className="sb-discover-list">
              {group.entries.map((entry) => {
                const percent = Math.round(
                  playlistPlayHistoryPercent(entry) * 100
                );
                const complete = isPlaylistPlayHistoryComplete(entry);
                const lastLabel = entry.lastItem
                  ? playlistItemLabel(entry.lastItem, t, resolveBookName)
                  : null;
                const sessionTime = formatHistorySessionTime(
                  entry.startedAtMs,
                  language
                );
                const summary = lastLabel
                  ? t("playlist-history-session-summary", {
                      defaultValue:
                        "{{time}} - {{percent}}% complete - {{item}}",
                      time: sessionTime,
                      percent,
                      item: lastLabel,
                    })
                  : t("playlist-history-session-summary-no-item", {
                      defaultValue: "{{time}} - {{percent}}% complete",
                      time: sessionTime,
                      percent,
                    });

                const live = userPlaylists.find(
                  (p) =>
                    p.id === entry.playlistId &&
                    p.recordName === entry.playlistRecordName
                );
                const heroUrl =
                  live?.heroImageUrl ?? entry.playlistHeroImageUrl ?? null;

                return (
                  <li
                    key={entry.id}
                    className="sb-discover-item sb-discover-item--row sb-playlist-item sb-playlist-history-item"
                    dir="auto"
                    onClick={() => playFromHistory(playlists, entry, toast, t)}
                  >
                    <HeroImageThumb url={heroUrl} />
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
                      onClick={(e) => {
                        e.stopPropagation();
                        playFromHistory(playlists, entry, toast, t);
                      }}
                    >
                      <MaterialIcon>play_arrow</MaterialIcon>
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
                          void playlists.removePlayHistory(entry);
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
        ))
      )}
    </DiscoverSection>
  );
}

/**
 * Confirmation body shown before permanently deleting a playlist. Confirming
 * erases the playlist and closes the modal; on failure it surfaces a toast but
 * still closes.
 */
function ConfirmDeletePlaylistModalContent(props: {
  playlists: PlaylistManager;
  playlist: Playlist;
  toast: SeedBibleState["app"]["toast"];
  onClose: () => void;
}) {
  const { playlists, playlist, toast, onClose } = props;
  const { t } = useI18n();

  const confirm = async () => {
    try {
      await playlists.deletePlaylist(playlist);
    } catch {
      toast(
        t("delete-playlist-failed", {
          defaultValue: "Couldn't delete the playlist.",
        })
      );
    }
    onClose();
  };

  return (
    <div className="sb-confirm-delete">
      <p className="sb-confirm-delete-message">
        {t("delete-playlist-confirm-message", {
          title:
            playlist.title ??
            t("untitled-playlist", { defaultValue: "Untitled playlist" }),
          defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
        })}
      </p>
      <div className="sb-confirm-delete-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={confirm}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

/** Opens the delete-playlist confirmation modal. */
function openDeletePlaylistConfirm(
  modals: ModalManager,
  playlists: PlaylistManager,
  playlist: Playlist,
  toast: SeedBibleState["app"]["toast"]
) {
  const modalId = `delete-playlist-confirm-${playlist.id}`;
  modals.openModal({
    id: modalId,
    title: {
      key: "delete-playlist-confirm-title",
      defaultValue: "Delete playlist?",
    },
    content: () => (
      <ConfirmDeletePlaylistModalContent
        playlists={playlists}
        playlist={playlist}
        toast={toast}
        onClose={() => modals.closeModal(modalId)}
      />
    ),
  });
}
