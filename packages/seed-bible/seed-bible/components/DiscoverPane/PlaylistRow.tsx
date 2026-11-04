import { i18n, useI18n } from "../../i18n";
import type { ModalManager } from "../../managers/ModalManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import { ShareModal } from "../ShareModal/shareModal";
import { HeroImageThumb } from "../HeroImageField/HeroImageField";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";
import { openConfirmDeleteModal } from "../ConfirmDeleteModal/ConfirmDeleteModal";

/**
 * One playlist in a `sb-discover-list`: title, description, a play button,
 * and a menu offering share, edit and delete. A cover thumbnail is shown
 * only when the playlist has one.
 *
 * Used by the profile screen's "Your content" and by friends' playlists in
 * Discover, so a playlist reads the same wherever it is listed. It renders an
 * `<li>`, so a caller has to wrap it in that list.
 */
export function PlaylistRow(props: {
  playlist: Playlist;
  playlists: PlaylistManager;
  modals: ModalManager;
  app: AppState;
  /**
   * Play and Edit each replace what is on screen — playback takes over, and
   * editing opens the Discover pane beside the reader. A caller showing this
   * row in a fullscreen pane therefore has to close itself first, so it can
   * pass its own handler. Both default to acting on the manager directly,
   * which is what the Discover list wants. Starting a session from Share
   * plays the playlist through `onPlay` too; delete needs no such hook.
   */
  onPlay?: (playlist: Playlist) => void;
  onEdit?: (playlist: Playlist) => void;
  /** Someone else's playlist: Share stays, Edit and Delete don't. */
  readOnly?: boolean;
}) {
  const { playlist, playlists, modals, app } = props;
  const { t } = useI18n();
  const play =
    props.onPlay ?? ((target: Playlist) => playlists.startPlaying(target));
  const edit =
    props.onEdit ?? ((target: Playlist) => playlists.editPlaylist(target));
  return (
    <li
      className="sb-discover-item sb-discover-item--row sb-playlist-item"
      dir="auto"
      onClick={() => play(playlist)}
    >
      {playlist.heroImageUrl ? (
        <HeroImageThumb url={playlist.heroImageUrl} />
      ) : null}
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
          play(playlist);
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
            openPlaylistShareModal({
              playlist,
              playlists,
              modals,
              app,
              play,
            });
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            share
          </MaterialIcon>
          {t("share", { defaultValue: "Share" })}
        </ContextMenuItem>
        {props.readOnly ? null : (
          <>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                edit(playlist);
              }}
            >
              <MaterialIcon className="sb-context-menu-item-icon">
                edit
              </MaterialIcon>
              {t("edit", { defaultValue: "Edit" })}
            </ContextMenuItem>
            <ContextMenuItem
              className="sb-context-menu-item--danger"
              onClick={(e) => {
                e.stopPropagation();
                openDeletePlaylistConfirm(
                  modals,
                  playlists,
                  playlist,
                  app.toast
                );
              }}
            >
              <MaterialIcon className="sb-context-menu-item-icon">
                delete
              </MaterialIcon>
              {t("delete-playlist", { defaultValue: "Delete" })}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuWithButton>
    </li>
  );
}

/** Opens the delete-playlist confirmation modal. */
function openDeletePlaylistConfirm(
  modals: ModalManager,
  playlists: PlaylistManager,
  playlist: Playlist,
  toast: AppState["toast"]
) {
  openConfirmDeleteModal(modals, {
    id: `delete-playlist-confirm-${playlist.id}`,
    title: {
      key: "delete-playlist-confirm-title",
      defaultValue: "Delete playlist?",
    },
    message: (t) =>
      t("delete-playlist-confirm-message", {
        title:
          playlist.title ??
          t("untitled-playlist", { defaultValue: "Untitled playlist" }),
        defaultValue: 'Delete "{{title}}"? This can\'t be undone.',
      }),
    onConfirm: () => playlists.deletePlaylist(playlist),
    failedMessage: (t) =>
      t("delete-playlist-failed", {
        defaultValue: "Couldn't delete the playlist.",
      }),
    toast,
  });
}

/**
 * Opens the same share sheet the reader uses, for a playlist: copy its link,
 * the device share sheet, a QR code of the link, and starting a live session
 * that plays the playlist for everyone who joins.
 */
export function openPlaylistShareModal(options: {
  playlist: Playlist;
  playlists: PlaylistManager;
  modals: ModalManager;
  app: AppState;
  play: (playlist: Playlist) => void;
}) {
  const { playlist, playlists, modals, app, play } = options;
  const url = playlists.getPlaylistUrl(playlist);
  const modalId = `share-playlist-${playlist.recordName}-${playlist.id}`;
  const close = () => modals.closeModal(modalId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      // Also covers no clipboard at all (an insecure origin, some webviews).
      console.error("Failed to copy the playlist link.", error);
      app.toast(
        i18n.t("playlist-url-copy-failed", {
          defaultValue: "Couldn't copy the playlist link",
        })
      );
      return;
    }
    app.toast(
      i18n.t("playlist-url-copied", {
        defaultValue: "Playlist URL copied to clipboard",
      })
    );
  };

  modals.openModal({
    id: modalId,
    title: { key: "share-sheet-title", defaultValue: "Share" },
    mobileSheet: true,
    content: () => (
      <ShareModal
        app={app}
        modals={modals}
        // A new session is always started rather than offering the current
        // one, so sharing never switches what an existing session is reading.
        session={null}
        linkQRCode={{ url, kind: "playlist" }}
        onSessionStarted={() => play(playlist)}
        onClose={close}
        onShareLink={() => {
          close();
          void copyLink();
        }}
        onShareVia={() => {
          close();
          void navigator
            .share?.({
              title:
                playlist.title ??
                i18n.t("untitled-playlist", {
                  defaultValue: "Untitled playlist",
                }),
              url,
            })
            .catch((error: unknown) => {
              if ((error as Error)?.name === "AbortError") return;
              console.error("Failed to share the playlist.", error);
            });
        }}
      />
    ),
  });
}
