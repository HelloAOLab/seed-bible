import "./PlaylistHtmlContent.css";
import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { setSafeHtml } from "../../managers/Sanitization";
import {
  parseVerseReference,
  type VerseRef,
} from "../../managers/BibleDataManager";

/**
 * Renders a playlist HTML snippet. The stored value was sanitized when the item
 * was created, but playlists are publicly readable and may come from untrusted
 * authors, so the HTML is sanitized again on render via {@link setSafeHtml}.
 *
 * With `onReferenceClick`, a scripture reference in the snippet calls it
 * instead of following its link, which would leave the page it's shown on.
 */
export function PlaylistHtmlContent(props: {
  html: string;
  onReferenceClick?: (ref: VerseRef) => void;
}) {
  const { html, onReferenceClick } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      void setSafeHtml(html, el);
    }
  }, [html]);

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (!onReferenceClick) {
      return;
    }
    const anchor = (event.target as HTMLElement).closest?.(
      "a.sb-verse-reference-link"
    );
    const parsed = anchor
      ? parseVerseReference(anchor.textContent ?? "")
      : null;
    if (!parsed) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onReferenceClick(parsed);
  };

  return (
    <div
      ref={ref}
      className="sb-play-playlist-content-html"
      dir="auto"
      onClick={handleClick}
    />
  );
}
