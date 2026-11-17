import "../PlaylistOverview/PlaylistOverview.css";
import "./PlaylistFinishedPane.css";
import { useI18n } from "../../i18n/I18nManager";
import type { SimplePlaylist } from "../../managers/PlaylistManager";
import { HeroImageBanner } from "../HeroImageField/HeroImageField";
import { MaterialIcon } from "../icons";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";

/**
 * What a playlist ends on, filling the screen as its intro page does: says
 * it's finished, with its cover, and offers to share it. The back button and
 * Done both leave the playlist.
 */
export function PlaylistFinishedPane(props: {
  playlist: SimplePlaylist;
  authorName: string | null;
  onDone: () => void;
  onShare: () => void;
}) {
  const { playlist } = props;
  const { t, isRtl } = useI18n();
  const title =
    playlist.title ??
    t("untitled-playlist", { defaultValue: "Untitled playlist" });
  const done = t("done", { defaultValue: "Done" });

  return (
    <div className="sb-playlist-page sb-playlist-finished-page">
      <div className="sb-playlist-page-header">
        <IconButton
          size="lg"
          className="sb-playlist-page-back"
          icon={isRtl ? "arrow_forward" : "arrow_back"}
          label={done}
          onClick={props.onDone}
        />
        <h1 className="sb-playlist-page-title">
          <span dir="auto">{title}</span>
        </h1>
      </div>
      <div className="sb-playlist-page-body">
        {playlist.heroImageUrl ? (
          <HeroImageBanner url={playlist.heroImageUrl} alt={title} />
        ) : null}
        <div className="sb-playlist-finished-celebration">
          <MaterialIcon className="sb-playlist-finished-icon">
            check_circle
          </MaterialIcon>
          <h2 className="sb-playlist-finished-heading">
            {t("playlist-finished", { defaultValue: "Playlist finished" })}
          </h2>
          <p className="sb-playlist-finished-message" dir="auto">
            {t("playlist-finished-message", {
              title,
              defaultValue: "You've reached the end of {{title}}.",
            })}
          </p>
          {props.authorName ? (
            <p className="sb-playlist-page-author">
              {t("shared-page-by-author", {
                author: props.authorName,
                defaultValue: "By {{author}}",
              })}
            </p>
          ) : null}
        </div>
      </div>
      <div className="sb-playlist-page-footer sb-playlist-finished-footer">
        <Button
          size="lg"
          icon="share"
          className="sb-playlist-finished-share"
          onClick={props.onShare}
        >
          {t("share-playlist", { defaultValue: "Share playlist" })}
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="sb-playlist-page-start"
          onClick={props.onDone}
        >
          {done}
        </Button>
      </div>
    </div>
  );
}
