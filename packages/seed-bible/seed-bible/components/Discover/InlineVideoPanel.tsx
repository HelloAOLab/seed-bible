import "./InlineVideoPanel.css";
import { useCallback, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { DiscoverInlineVideo } from "../../managers/DiscoverManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { CloseButton } from "../CloseButton/CloseButton";

/**
 * Starts an embedded player as soon as it loads. The reader opened the player
 * by clicking a video, so it should play without a second click.
 */
function withAutoplay(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("autoplay", "1");
    return url.toString();
  } catch {
    return embedUrl;
  }
}

/**
 * Publishes the panel's height as `--sb-inline-video-height` on its parent,
 * so the compact Discover panel stacked under it on desktop can stick just
 * below it instead of sliding underneath.
 */
function usePublishHeight() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((panel: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    const parent = panel?.parentElement;
    if (!panel || !parent || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      parent.style.setProperty(
        "--sb-inline-video-height",
        `${Math.ceil(panel.getBoundingClientRect().height)}px`
      );
    });
    observer.observe(panel);
    cleanupRef.current = () => {
      observer.disconnect();
      parent.style.removeProperty("--sb-inline-video-height");
    };
  }, []);
}

/**
 * The reader's inline video player: a discovered video playing beside the
 * scripture (or above it on an upright phone) instead of in a modal, so the
 * reader can follow along in the text while it plays. BibleReader decides
 * where it sits; this only draws the title row and the player.
 */
export function InlineVideoPanel(props: {
  video: DiscoverInlineVideo;
  onClose: () => void;
}) {
  const { video, onClose } = props;
  const { t } = useI18n();
  const panelRef = usePublishHeight();
  const media = resolveLinkMedia(video.url);

  return (
    <section
      ref={panelRef}
      className="sb-inline-video"
      aria-label={video.title}
    >
      <div className="sb-inline-video-header">
        <div className="sb-inline-video-heading">
          <span className="sb-inline-video-title" dir="auto">
            {video.title}
          </span>
          {video.author ? (
            <span className="sb-inline-video-author" dir="auto">
              {video.author}
            </span>
          ) : null}
        </div>
        <CloseButton
          className="sb-inline-video-close"
          label={t("close-video", { defaultValue: "Close video" })}
          onClose={onClose}
        />
      </div>
      <div className="sb-inline-video-frame">
        {media.kind === "video" ? (
          <video
            className="sb-inline-video-player"
            src={media.url}
            controls
            autoPlay
            playsInline
          />
        ) : media.kind === "embed" ? (
          <iframe
            className="sb-inline-video-player"
            src={withAutoplay(media.url)}
            allow="autoplay; encrypted-media; picture-in-picture; web-share; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            title={video.title}
          />
        ) : (
          <a
            className="sb-inline-video-link"
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("open-link", { defaultValue: "Open" })}
          </a>
        )}
      </div>
    </section>
  );
}
