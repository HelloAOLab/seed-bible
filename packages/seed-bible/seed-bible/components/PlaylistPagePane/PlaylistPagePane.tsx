import "../Discover/DiscoverPane.css";
import "./PlaylistPagePane.css";
import { useI18n } from "../../i18n/I18nManager";
import type { Playlist } from "../../managers/PlaylistManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { MaterialIcon } from "../icons";
import { playlistItemIcon } from "../playlistItemIcon";
import { playlistItemLabel } from "../playlistItemLabel";
import { PlaylistItemNoteTag } from "../PlaylistItemNoteTag/PlaylistItemNoteTag";

/**
 * What a shared playlist link opens on, filling the screen: a back button
 * that leaves it, the playlist's cover, author, description and items in a
 * scrolling area, and a Start button pinned below them.
 */
export function PlaylistPagePane(props: {
  playlist: Playlist;
  authorName: string | null;
  /** A book's name in the reader's translation, for the scripture items. */
  resolveBookName: (bookId: string) => string;
  onStart: () => void;
  onBack: () => void;
}) {
  const { playlist, authorName, resolveBookName } = props;
  const { t, isRtl } = useI18n();
  const title =
    playlist.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });
  const description = playlist.description?.trim() || null;
  const items = playlist.items;

  return (
    <div className="sb-playlist-page">
      <div className="sb-playlist-page-header">
        <button
          type="button"
          className="sb-playlist-page-back"
          aria-label={t("back", { defaultValue: "Back" })}
          title={t("back", { defaultValue: "Back" })}
          onClick={props.onBack}
        >
          <MaterialIcon>{isRtl ? "arrow_forward" : "arrow_back"}</MaterialIcon>
        </button>
        <h1 className="sb-playlist-page-title">
          <span dir="auto">{title}</span>
        </h1>
      </div>
      <div className="sb-playlist-page-body">
        {playlist.heroImageUrl ? (
          <HeroImageBanner url={playlist.heroImageUrl} alt={title} />
        ) : null}
        <div className="sb-playlist-page-about">
          {authorName ? (
            <p className="sb-playlist-page-author">
              {t("shared-page-by-author", {
                author: authorName,
                defaultValue: "By {{author}}",
              })}
            </p>
          ) : null}
          {description ? (
            <p className="sb-playlist-page-description" dir="auto">
              {description}
            </p>
          ) : null}
          <p className="sb-playlist-page-count">
            {t("playlist-page-item-count", {
              count: items.length,
              defaultValue: "{{count}} items",
            })}
          </p>
        </div>
        <ol className="sb-discover-list sb-playlist-page-items">
          {items.map((item, index) => (
            <li
              key={index}
              className="sb-discover-item sb-discover-item--row sb-playlist-page-item"
            >
              <MaterialIcon className="sb-discover-item-icon">
                {playlistItemIcon(item)}
              </MaterialIcon>
              <span className="sb-discover-item-title" dir="auto">
                {playlistItemLabel(item, t, resolveBookName)}
                <PlaylistItemNoteTag item={item} />
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="sb-playlist-page-footer">
        <button
          type="button"
          className="sb-playlist-page-start"
          disabled={items.length === 0}
          onClick={props.onStart}
        >
          {t("start-reading", { defaultValue: "Start Reading" })}
        </button>
      </div>
    </div>
  );
}
