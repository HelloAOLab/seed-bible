import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

export interface EmbedPlaybackOptions {
  /** Start playing as soon as the player loads. */
  autoplay?: boolean;
  /** Seconds into the video to start from. */
  startAt?: number;
  /** Ask YouTube to report the playback position (see {@link useYouTubeCurrentTime}). */
  reportTime?: boolean;
}

const YOUTUBE_ORIGIN = "https://www.youtube.com";

function isYouTubeEmbed(url: URL): boolean {
  return url.origin === YOUTUBE_ORIGIN && url.pathname.startsWith("/embed/");
}

/**
 * Adds autoplay, a start time and position reporting to a YouTube or Vimeo
 * embed URL from `resolveLinkMedia`. Other URLs come back unchanged.
 */
export function withEmbedPlayback(
  embedUrl: string,
  options: EmbedPlaybackOptions
): string {
  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    return embedUrl;
  }
  const startAt = Math.floor(options.startAt ?? 0);

  if (isYouTubeEmbed(url)) {
    if (options.autoplay) url.searchParams.set("autoplay", "1");
    if (startAt > 0) url.searchParams.set("start", String(startAt));
    if (options.reportTime && typeof window !== "undefined") {
      url.searchParams.set("enablejsapi", "1");
      url.searchParams.set("origin", window.location.origin);
    }
    return url.toString();
  }

  if (url.hostname === "player.vimeo.com") {
    if (options.autoplay) url.searchParams.set("autoplay", "1");
    if (startAt > 0) url.hash = `t=${startAt}s`;
    return url.toString();
  }

  return embedUrl;
}

/** A direct video file's URL, starting `startAt` seconds in (a media fragment). */
export function withVideoStart(videoUrl: string, startAt?: number): string {
  const start = Math.floor(startAt ?? 0);
  return start > 0 ? `${videoUrl.split("#")[0]}#t=${start}` : videoUrl;
}

/**
 * Calls `onTime` with a YouTube embed's playback position as it plays.
 *
 * Uses the messages YouTube's player sends to the page once asked to
 * ("listening"), which is what YouTube's own IFrame API script does under the
 * hood. Loading that script instead would run YouTube's code on our origin,
 * next to the reader's session. If YouTube ever stops answering, nothing is
 * reported and callers simply don't learn the position.
 */
export function useYouTubeCurrentTime(
  iframeRef: RefObject<HTMLIFrameElement>,
  onTime: ((seconds: number) => void) | undefined
) {
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;
  const enabled = !!onTime;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !enabled) return;

    const startListening = () => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        YOUTUBE_ORIGIN
      );
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_ORIGIN) return;
      if (event.source !== iframe.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      const currentTime = (data as { info?: { currentTime?: unknown } } | null)
        ?.info?.currentTime;
      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        onTimeRef.current?.(currentTime);
      }
    };

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", startListening);
    // In case the player loaded before this ran.
    startListening();
    return () => {
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", startListening);
    };
  }, [iframeRef, enabled]);
}
