import "./PlaylistStepPage.css";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { VerseRef } from "../../managers/BibleDataManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "../PlaylistLinkContent/PlaylistLinkContent";

type PageItem = Exclude<PlaylistItemData, { type: "bible-verse" }>;

/**
 * The title a note, question or video step shows at the top of its page, or
 * null when it has none to show.
 */
export function playlistStepPageTitle(item: PageItem): string | null {
  return (
    item.title?.trim() ||
    (item.type === "link" ? item.preview?.title?.trim() : undefined) ||
    null
  );
}

/**
 * A playing playlist's note, question or video step, shown in the reader in
 * place of the chapter so it reads (and scrolls, with the bars tucking away)
 * like scripture does. `showTitle` is off where the reader's own header
 * carries the title instead.
 */
export function PlaylistStepPage(props: {
  item: PageItem;
  showTitle: boolean;
  /** A note's links to passages and to other steps. */
  onReferenceClick?: (ref: VerseRef) => void;
  onStepClick?: (index: number) => void;
}) {
  const { item, showTitle } = props;
  const title = showTitle ? playlistStepPageTitle(item) : null;
  const ref = useRef<HTMLElement>(null);
  // A step opens at its top, wherever the reader had scrolled the step before.
  useLayoutEffect(() => {
    for (let el = ref.current?.parentElement; el; el = el.parentElement) {
      const { overflowY } = getComputedStyle(el);
      if (overflowY === "auto" || overflowY === "scroll") {
        el.scrollTop = 0;
        return;
      }
    }
  }, []);
  return (
    <article ref={ref} className="sb-playlist-step-page">
      {title ? (
        <h2 className="sb-playlist-step-page-title" dir="auto">
          {title}
        </h2>
      ) : null}
      <div className="sb-playlist-step-page-body">
        {item.type === "html" ? (
          <PlaylistHtmlContent
            html={item.html}
            onReferenceClick={props.onReferenceClick}
            onStepClick={props.onStepClick}
          />
        ) : (
          <PlaylistLinkContent
            url={item.url}
            title={item.title}
            embed={item.embed}
            preview={item.preview}
          />
        )}
      </div>
    </article>
  );
}
