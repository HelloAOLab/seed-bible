import "./PlaylistLinkContent.css";
import { useI18n } from "../../i18n";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { safeImageUrl, type LinkPreview } from "../../managers/linkPreview";

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
 *
 * A plain link with a stored `preview` shows the page's image, title, and
 * description above the "Open" button, so the reader can see where it goes.
 */
export function PlaylistLinkContent(props: {
  url: string;
  title?: string;
  embed?: boolean;
  preview?: LinkPreview;
  /** What is said in the video, for readers who can't hear it. */
  transcript?: string;
}) {
  const { t } = useI18n();
  const media = resolveLinkMedia(props.url);
  const transcript = props.transcript?.trim() ? (
    <details className="sb-play-playlist-transcript">
      <summary>
        {t("playlist-video-transcript", { defaultValue: "Transcript" })}
      </summary>
      <p dir="auto">{props.transcript}</p>
    </details>
  ) : null;

  if (media.kind === "video") {
    return (
      <div className="sb-play-playlist-content-media">
        <div className="sb-play-playlist-content-embed sb-play-playlist-content-embed--video">
          <video
            className="sb-play-playlist-content-video"
            src={media.url}
            controls
            playsInline
          />
        </div>
        {transcript}
      </div>
    );
  }

  if (media.kind === "embed" || (media.kind === "link" && props.embed)) {
    // A known video site plays at 16:9; any other page fills the space.
    const video = media.kind === "embed";
    return (
      <div className="sb-play-playlist-content-media">
        <div
          className={`sb-play-playlist-content-embed${
            video ? " sb-play-playlist-content-embed--video" : ""
          }`}
        >
          <iframe
            className="sb-play-playlist-content-iframe"
            src={media.url}
            allow="autoplay; encrypted-media; web-share; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            title={props.title?.trim() || props.url}
          />
        </div>
        {transcript}
      </div>
    );
  }

  const preview = props.preview;
  const imageUrl = safeImageUrl(preview?.imageUrl);

  return (
    <div className="sb-play-playlist-content-link-wrapper">
      {preview ? (
        <div className="sb-play-playlist-link-preview">
          {imageUrl ? (
            <img
              className="sb-play-playlist-link-preview-image"
              src={imageUrl}
              alt={preview.imageAlt ?? ""}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : null}
          {preview.siteName ? (
            <div className="sb-play-playlist-link-preview-site" dir="auto">
              {preview.siteName}
            </div>
          ) : null}
          {preview.title ? (
            <div className="sb-play-playlist-link-preview-title" dir="auto">
              {preview.title}
            </div>
          ) : null}
          {preview.description ? (
            <p className="sb-play-playlist-link-preview-description" dir="auto">
              {preview.description}
            </p>
          ) : null}
        </div>
      ) : null}
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
