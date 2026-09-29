import "./PlaylistPageModal.css";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistPage } from "../../managers/PlaylistManager";

/**
 * What a shared playlist link opens on: the playlist's cover, author,
 * description and length, with a choice to start it or go home.
 */
export function PlaylistPageModalContent(props: {
  page: PlaylistPage;
  onStart: () => void;
  onClose: () => void;
}) {
  const { page, onStart, onClose } = props;
  const { playlist, authorName } = page;
  const { t } = useI18n();

  return (
    <div className="sb-playlist-page-modal" dir="auto">
      {playlist.heroImageUrl ? (
        <img
          className="sb-playlist-page-modal-hero"
          src={playlist.heroImageUrl}
          alt=""
        />
      ) : null}
      {authorName ? (
        <p className="sb-playlist-page-modal-author">
          {t("playlist-page-by-author", {
            author: authorName,
            defaultValue: "By {{author}}",
          })}
        </p>
      ) : null}
      {playlist.description ? (
        <p className="sb-playlist-page-modal-description">
          {playlist.description}
        </p>
      ) : null}
      <p className="sb-playlist-page-modal-count">
        {t("playlist-page-item-count", {
          count: playlist.items.length,
          defaultValue: "{{count}} items",
        })}
      </p>
      <div className="sb-playlist-page-modal-actions">
        <button type="button" onClick={onClose}>
          {t("close", { defaultValue: "Close" })}
        </button>
        <button
          type="button"
          className="sb-playlist-page-modal-start"
          onClick={onStart}
          disabled={playlist.items.length === 0}
        >
          {t("playlist-page-start", { defaultValue: "Start Playlist" })}
        </button>
      </div>
    </div>
  );
}

/**
 * What a link to a playlist that doesn't exist (deleted, or a mistyped link)
 * opens on, in place of the playlist modal. Closing it goes home.
 */
export function PlaylistNotFoundModalContent(props: { onClose: () => void }) {
  const { t } = useI18n();

  return (
    <div className="sb-playlist-page-modal sb-playlist-page-modal--not-found">
      <p className="sb-playlist-page-modal-description">
        {t("playlist-not-found-message", {
          defaultValue:
            "This playlist doesn't exist, or it has been deleted. Check the link, or ask the person who shared it for a new one.",
        })}
      </p>
      <div className="sb-playlist-page-modal-actions">
        <button
          type="button"
          className="sb-playlist-page-modal-start"
          onClick={props.onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
      </div>
    </div>
  );
}
