import "./PlaylistLinkContent.css";
import { useI18n } from "../../i18n";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";

/**
 * Renders a playlist link item based on what its URL points at (see
 * {@link resolveLinkMedia}): a direct video file plays in a `<video>` element,
 * a known video site (YouTube, Vimeo) embeds in an `<iframe>`, and anything
 * else shows the URL with a prominent "Open" button that opens a new tab.
 *
 * When the author checked "embed", any URL that isn't already a video or a
 * known video site is shown in an `<iframe>` instead of an "Open" link. Video
 * detection still takes precedence, so ticking embed never changes how a
 * recognized video renders.
 */
export function PlaylistLinkContent(props: {
  url: string;
  title?: string;
  embed?: boolean;
}) {
  const { t } = useI18n();
  const media = resolveLinkMedia(props.url);

  if (media.kind === "video") {
    return (
      <video
        className="sb-play-playlist-content-video"
        src={media.url}
        controls
        playsInline
      />
    );
  }

  if (media.kind === "embed" || (media.kind === "link" && props.embed)) {
    return (
      <iframe
        className="sb-play-playlist-content-iframe"
        src={media.url}
        allow="autoplay; encrypted-media; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        title={props.title?.trim() || props.url}
      />
    );
  }

  return (
    <div className="sb-play-playlist-content-link-wrapper">
      <a
        className="sb-play-playlist-content-link"
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        dir="auto"
      >
        {props.url}
      </a>
      <a
        className="sb-settings-save-button sb-play-playlist-open-button"
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("open-link", { defaultValue: "Open" })}
      </a>
    </div>
  );
}
