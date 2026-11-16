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
 * With `onStepClick`, a link to another step of the playlist (inserted by the
 * editor's "Link item") calls it with that step's index.
 */
export function PlaylistHtmlContent(props: {
  html: string;
  onReferenceClick?: (ref: VerseRef) => void;
  onStepClick?: (index: number) => void;
}) {
  const { html, onReferenceClick, onStepClick } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      void setSafeHtml(html, el);
    }
  }, [html]);

  const handleClick = (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    const stepLink = (event.target as HTMLElement).closest?.(
      'a[href^="#playlist-step-"]'
    );
    if (stepLink) {
      // Without a handler there's nowhere to go, so the click does nothing
      // rather than jumping the page to a missing anchor.
      event.preventDefault();
      const step = parseInt(
        stepLink.getAttribute("href")!.slice("#playlist-step-".length),
        10
      );
      if (onStepClick && step >= 1) {
        event.stopPropagation();
        onStepClick(step - 1);
      }
      return;
    }
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
      // Its paragraphs are what a shared session's presence counts (see
      // PresenceArea in BibleReader.tsx).
      data-presence-units
      onClick={handleClick}
    />
  );
}
