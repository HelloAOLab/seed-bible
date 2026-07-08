import "./PlaylistHtmlContent.css";
import { useEffect, useRef } from "preact/hooks";
import { setSafeHtml } from "../managers/Sanitization";

/**
 * Renders a playlist HTML snippet. The stored value was sanitized when the item
 * was created, but playlists are publicly readable and may come from untrusted
 * authors, so the HTML is sanitized again on render via {@link setSafeHtml}.
 */
export function PlaylistHtmlContent(props: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      void setSafeHtml(props.html, el);
    }
  }, [props.html]);
  return <div ref={ref} className="sb-play-playlist-content-html" dir="auto" />;
}
