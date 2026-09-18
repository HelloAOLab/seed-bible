import { useI18n } from "../../i18n";
import type { ModalManager } from "../../managers/ModalManager";
import type { Playlist, PlaylistManager } from "../../managers/PlaylistManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { HeroImageThumb } from "../HeroImageField/HeroImageField";
import { ExpandableText } from "../ExpandableText/ExpandableText";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";

/**
 * One playlist in a `sb-discover-list`: cover thumbnail, title, description,
 * a play button, and a menu offering share, edit and delete.
 *
 * Shared by the Discover panel's playlist list and by the profile screen's
 * "Your content", so the same playlist offers the same actions and reads the
 * same in both places. It renders an `<li>`, so a caller has to wrap it in
 * that list.
 */
export function PlaylistRow(props: {
  playlist: Playlist;
  playlists: PlaylistManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  /**
   * Play and Edit each replace what is on screen — playback takes over, and
   * editing opens the Discover pane beside the reader. A caller showing this
   * row in a fullscreen pane therefore has to close itself first, so it can
   * pass its own handler. Both default to acting on the manager directly,
   * which is what the Discover list wants. Share and delete need no such
   * hook: neither navigates anywhere.
   */
  onPlay?: (playlist: Playlist) => void;
  onEdit?: (playlist: Playlist) => void;
}) {
  const { playlist, playlists, modals, toast } = props;
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
            edit(playlist);
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
            openDeletePlaylistConfirm(modals, playlists, playlist, toast);
          }}
        >
          <MaterialIcon className="sb-context-menu-item-icon">
            delete
          </MaterialIcon>
          {t("delete-playlist", { defaultValue: "Delete" })}
        </ContextMenuItem>
      </ContextMenuWithButton>
    </li>
  );
}

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
