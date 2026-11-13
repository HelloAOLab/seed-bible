import { useI18n } from "../../i18n/I18nManager";
import type { Playlist } from "../../managers/PlaylistManager";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";
import { MaterialIcon } from "../icons";
import {
  PlaylistOverview,
  PlaylistStepRow,
} from "../PlaylistOverview/PlaylistOverview";
import { IconButton } from "../IconButton/IconButton";

/**
 * What a playlist's link (or its play button) opens on, filling the screen:
 * the playlist's overview, with a Start Reading button that starts it, Share
 * at the top, and for its owner a menu to edit or delete it.
 */
export function PlaylistPagePane(props: {
  playlist: Playlist;
  authorName: string | null;
  /** A book's name in the reader's translation, for the scripture items. */
  resolveBookName: (bookId: string) => string;
  onStart: () => void;
  onBack: () => void;
  onShare: () => void;
  /** Given only to the playlist's owner. */
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { playlist, resolveBookName } = props;
  const { t } = useI18n();

  return (
    <PlaylistOverview
      title={
        playlist.title ??
        t("untitled-playlist", { defaultValue: "Untitled playlist" })
      }
      backLabel={t("back", { defaultValue: "Back" })}
      onBack={props.onBack}
      headerActions={
        <>
          <IconButton
            size="lg"
            className="sb-playlist-page-back sb-playlist-page-share"
            icon="share"
            label={t("share", { defaultValue: "Share" })}
            onClick={props.onShare}
          />
          {props.onEdit || props.onDelete ? (
            <ContextMenuWithButton
              buttonClassName="sb-playlist-page-menu"
              aria-label={t("playlist-options", {
                defaultValue: "Playlist options",
              })}
            >
              {props.onEdit ? (
                <ContextMenuItem onClick={props.onEdit}>
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit", { defaultValue: "Edit" })}
                </ContextMenuItem>
              ) : null}
              {props.onDelete ? (
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={props.onDelete}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-playlist", { defaultValue: "Delete" })}
                </ContextMenuItem>
              ) : null}
            </ContextMenuWithButton>
          ) : null}
        </>
      }
      heroImageUrl={playlist.heroImageUrl ?? null}
      authorName={props.authorName}
      description={playlist.description?.trim() || null}
      items={playlist.items}
      action={{
        label: t("start-reading", { defaultValue: "Start Reading" }),
        onClick: props.onStart,
        disabled: playlist.items.length === 0,
      }}
    >
      {playlist.items.map((item, index) => (
        <PlaylistStepRow
          key={index}
          item={item}
          resolveBookName={resolveBookName}
        />
      ))}
    </PlaylistOverview>
  );
}
