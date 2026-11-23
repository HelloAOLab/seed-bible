import "./InlineVideoPanel.css";
import { useCallback, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { DiscoverInlineVideo } from "../../managers/DiscoverManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { CloseButton } from "../CloseButton/CloseButton";
import { PlaylistLinkContent } from "../PlaylistLinkContent/PlaylistLinkContent";

/**
 * How far into each playing video the reader got. The player is rebuilt when
 * it moves to another part of the page (a phone turned sideways switches the
 * reader's layout), and this lets the new one carry on from the same moment.
 * Keyed by the video object, so playing it again after closing starts over.
 */
const resumePositions = new WeakMap<DiscoverInlineVideo, number>();

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
  // Read once: the position keeps updating while this player plays, and
  // feeding it back into the player's URL would reload it.
  const [startAt] = useState(() => resumePositions.get(video));
  const isVideo = resolveLinkMedia(video.url).kind !== "link";

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
      <div className={isVideo ? "sb-inline-video-frame" : undefined}>
        <PlaylistLinkContent
          url={video.url}
          title={video.title}
          autoplay
          startAt={startAt}
          onTimeUpdate={(seconds) => resumePositions.set(video, seconds)}
        />
      </div>
    </section>
  );
}
