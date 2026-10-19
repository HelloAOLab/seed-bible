import "./PlaylistHtmlContent.css";
import { useEffect, useRef } from "preact/hooks";
import { setSafeHtml } from "../../managers/Sanitization";
import { parseVerseReference } from "../../managers/BibleDataManager";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { passageVerses } from "../scripturePassage";
import { parseStepLinkHref } from "../TipTapEditor/StepLinkMark";

/**
 * Renders a playlist HTML snippet. The stored value was sanitized when the item
 * was created, but playlists are publicly readable and may come from untrusted
 * authors, so the HTML is sanitized again on render via {@link setSafeHtml}.
 *
 * Two kinds of markup the editor writes get brought to life here: a link to
 * another step (`a.sb-step-link`, see `StepLinkMark`) is handed to
 * `onStepLink` instead of followed, and an embedded passage
 * (`blockquote.sb-scripture-embed`, see `ScriptureEmbedNode`) gets its verses
 * loaded and written in under its reference when `loadChapter` is given.
 */
export function PlaylistHtmlContent(props: {
  html: string;
  /** Called with the 1-based step number a step link points at. */
  onStepLink?: (step: number) => void;
  /** Loads chapters so embedded passages can show their verses. */
  loadChapter?: ScriptureChapterLoader;
}) {
  const { html, onStepLink, loadChapter } = props;
  const ref = useRef<HTMLDivElement>(null);
  const onStepLinkRef = useRef(onStepLink);
  onStepLinkRef.current = onStepLink;

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    let cancelled = false;
    void setSafeHtml(html, el).then(async () => {
      if (cancelled || !loadChapter) {
        return;
      }
      const embeds = Array.from(
        el.querySelectorAll<HTMLElement>("blockquote.sb-scripture-embed")
      );
      await Promise.all(
        embeds.map(async (embed) => {
          const label =
            embed.querySelector(".sb-scripture-embed-ref")?.textContent ??
            embed.textContent ??
            "";
          const parsed = parseVerseReference(label.trim());
          if (!parsed) {
            return;
          }
          try {
            const chapter = await loadChapter(
              undefined,
              parsed.book,
              parsed.chapter
            );
            if (cancelled) {
              return;
            }
            const verses = passageVerses(chapter, {
              bookId: parsed.book,
              chapter: parsed.chapter,
              verse: parsed.verse,
              endVerse: parsed.endVerse,
            });
            if (verses.length === 0) {
              return;
            }
            embed
              .querySelectorAll(".sb-scripture-embed-text")
              .forEach((old) => old.remove());
            const text = document.createElement("p");
            text.className = "sb-scripture-embed-text";
            for (const verse of verses) {
              const number = document.createElement("sup");
              number.className = "sb-scripture-embed-verse-number";
              number.textContent = String(verse.number);
              text.appendChild(number);
              text.appendChild(document.createTextNode(`${verse.text} `));
            }
            embed.appendChild(text);
          } catch (error) {
            console.error("Failed to load an embedded passage:", error);
          }
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [html, loadChapter]);

  return (
    <div
      ref={ref}
      className="sb-play-playlist-content-html"
      dir="auto"
      onClick={(event: MouseEvent) => {
        const anchor = (event.target as HTMLElement).closest?.(
          "a.sb-step-link"
        );
        if (!anchor) {
          return;
        }
        const step = parseStepLinkHref(anchor.getAttribute("href"));
        if (step === null) {
          return;
        }
        event.preventDefault();
        onStepLinkRef.current?.(step);
      }}
    />
  );
}
