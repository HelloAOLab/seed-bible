import "./DiscoverPane.css";
import "./DiscoverShared.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager, ReaderTab } from "../../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { DiscoverReference } from "../../managers/DiscoverManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { ModalManager } from "../../managers/ModalManager";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { CreatePlaylistForm } from "../CreatePlaylistForm/CreatePlaylistForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";

interface DiscoverPaneProps {
  tabs: TabsManager;
  playlists: PlaylistManager;
  modals: ModalManager;
  state: SeedBibleState;
  toast: SeedBibleState["app"]["toast"];
}

type ReferenceWithBookData = DiscoverReference & { bookData: TranslationBook };

/**
 * Header actions rendered in the pane's `PaneHeader` slot (see how the Discover
 * side pane is opened in `SeedBibleStateManager`). Only the discover sub-view
 * offers "create a playlist", so the button hides itself during the
 * create/play sub-views. Reads the `actualView` signal, so it stays reactive
 * and resets alongside the pane body when the active tab stops playing.
 */
export function DiscoverPaneHeader(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();

  if (playlists.actualView.value !== "discover") {
    return null;
  }

  return (
    <button
      type="button"
      className="sb-discover-create"
      onClick={() => playlists.createNewPlaylist()}
    >
      + {t("create-playlist", { defaultValue: "Create" })}
    </button>
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
export function DiscoverPaneTitle(props: { playlists: PlaylistManager }) {
  const { playlists } = props;
  const { t } = useI18n();
  const view = playlists.actualView.value;

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
    return (
      <div className="sb-discover-title-row">
        <button
          type="button"
          className="sb-reading-plans-back"
          aria-label={t("back", { defaultValue: "Back" })}
          onClick={() => playlists.cancelEditingPlaylist()}
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
            if (editing) {
              playlists.editingPlaylist.value = {
                ...editing,
                title: value.trim() ? value : null,
              };
            }
          }}
          placeholder={t("playlist-title_placeholder", {
            defaultValue: "Playlist title",
          })}
        />
      </div>
    );
  }

  return <>{t("discover", { defaultValue: "Discover" })}</>;
}

/**
 * Pane content for the "Discover" tool. Shows the user's authored playlists plus
 * discovered cross references, study notes, and content for the currently
 * selected reader tab. Annotations are a placeholder for now (display-only).
 *
 * Rendered inside the managed side pane (`SidePane`), so the pane shell supplies
 * the surrounding chrome — the title/close (`PaneHeader`), the docking layout,
 * and the mobile-fullscreen behavior. This component just renders the content.
 */
export function DiscoverPane(props: DiscoverPaneProps) {
  const { tabs, playlists, modals } = props;
  const { t } = useI18n();
  const { actualView } = playlists;

  if (actualView.value === "create_playlist") {
    return (
      <CreatePlaylistForm playlists={playlists} tabs={tabs} modals={modals} />
    );
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

      <DiscoverSection
        title={t("annotations", { defaultValue: "Annotations" })}
      >
        <DiscoverEmpty
          text={t("discover-annotations-empty", {
            defaultValue: "You have no annotations",
          })}
        />
      </DiscoverSection>

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
              <div className="sb-discover-item-main">
                <span className="sb-discover-item-title">
                  {playlist.title ??
                    t("untitled-playlist", {
                      defaultValue: "Untitled playlist",
                    })}
                </span>
                {playlist.description ? (
                  <span className="sb-discover-item-description">
                    {playlist.description}
                  </span>
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

function CrossReferencesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("cross-references", { defaultValue: "Cross references" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredCrossReferences.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-cross-references-empty", {
            defaultValue: "No cross references for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.crossReference)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function StudyNotesSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("study-notes", { defaultValue: "Study notes" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredStudyNotes.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-study-notes-empty", {
            defaultValue: "No study notes for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">
                {formatRef(result.reference)}
              </span>
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function ContentSection(props: { tab: ReaderTab | null }) {
  const { tab } = props;
  const { t } = useI18n();
  const title = t("content", { defaultValue: "Content" });

  if (!tab) {
    return <DiscoverSection title={title}>{noTabHint(t)}</DiscoverSection>;
  }

  const groups = tab.readingState.discoveredContent.value;
  const results = groups.flatMap((group) => group.results);

  if (results.length <= 0) {
    return null; // Don't show the section at all if there are no results, since this is a "discover" feature and we don't want to show empty sections for chapters that have no cross references.
  }

  return (
    <DiscoverSection title={title}>
      {results.length === 0 ? (
        <DiscoverEmpty
          text={t("discover-content-empty", {
            defaultValue: "No content for this chapter.",
          })}
        />
      ) : (
        <ul className="sb-discover-list">
          {results.map((result, index) => (
            <li key={index} className="sb-discover-item">
              <span className="sb-discover-item-title">{result.title}</span>
              {result.description ? (
                <span className="sb-discover-item-description">
                  {result.description}
                </span>
              ) : null}
              <div className="sb-discover-item-content">{result.content}</div>
            </li>
          ))}
        </ul>
      )}
    </DiscoverSection>
  );
}

function noTabHint(t: ReturnType<typeof useI18n>["t"]) {
  return (
    <DiscoverEmpty
      text={t("discover-select-tab", {
        defaultValue: "Select a tab to discover related material.",
      })}
    />
  );
}

/** Formats a discovered reference into a human-readable label (e.g. "Genesis 1:1"). */
function formatRef(ref: ReferenceWithBookData): string {
  const book = ref.bookData.commonName ?? ref.bookData.name;
  let label = `${book} ${ref.chapter}`;
  if (ref.verse != null) {
    label += `:${ref.verse}`;
    if (ref.endVerse != null) {
      label += `-${ref.endVerse}`;
    }
  }
  return label;
}
