import "./DiscoverPane.css";
import "./DiscoverShared.css";
import { useI18n } from "../../i18n/I18nManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { CreatePlaylistForm } from "../CreatePlaylistForm/CreatePlaylistForm";
import { CreateAnnotationForm } from "../CreateAnnotationForm/CreateAnnotationForm";
import { PlayPlaylistView } from "../PlayPlaylistView/PlayPlaylistView";
import { DiscoverSection, DiscoverEmpty } from "./DiscoverSection";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
} from "./DiscoveredResultsSections";
import {
  AnnotationsSection,
  annotationLocationLabel,
} from "./AnnotationsSection";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";

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
}) {
  const { playlists, annotations, tabs } = props;
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
      <CreatePlaylistForm playlists={playlists} tabs={tabs} modals={modals} />
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
