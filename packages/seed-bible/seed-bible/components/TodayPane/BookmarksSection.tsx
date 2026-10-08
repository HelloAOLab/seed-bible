import {
  useComputed,
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import { TitledSection } from "./TitledSection";
import { BookmarkGlyph } from "../Bookmarks/Bookmarks";
import { useHorizontalScroll } from "../useHorizontalScroll";
import { useI18n } from "../../i18n";
import type { TranslationBooks } from "../../managers/FreeUseBibleAPI";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

/**
 * What the strip shows for one bookmark. Only the fields it needs, so the
 * component depends on no manager.
 */
export interface BookmarkStripItem {
  id: string;
  name: string;
  colorId: string;
  translationId: string;
  bookId: string;
  chapterNumber: number;
}

/** One bookmark chip: its label, and where tapping it goes. */
interface BookmarkData {
  key: string;
  name: string;
  colorId: string;
  text: string;
  handleClick: () => void;
}

/**
 * Flat strip of bookmark chips on the Today screen, in the order given (most
 * recently moved first). Tapping one opens its chapter.
 */
export const BookmarksSection = (props: {
  today: TodayManager;
  bookmarks: ReadonlySignal<BookmarkStripItem[]>;
  isMobile: ReadonlySignal<boolean>;
  onOpenPassage: (target: TodayPassageTarget) => void;
  onShowBookmarksList: () => void;
}) => {
  const { bookmarks, isMobile, onOpenPassage, onShowBookmarksList } = props;
  const { getTranslationBooks } = props.today;
  const { t } = useI18n();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reactive cache of translation → books. `getTranslationBooks` is async
  // (it fetches + caches on miss), so we resolve book names here and recompute
  // the chips as each translation's books arrive.
  const booksByTranslation = useSignal<Map<string, TranslationBooks>>(
    new Map()
  );

  useSignalEffect(() => {
    const pendingIds = new Set(
      bookmarks.value.map((bookmark) => bookmark.translationId)
    );

    for (const translationId of pendingIds) {
      if (booksByTranslation.value.has(translationId)) continue;

      void getTranslationBooks(translationId).then((books) => {
        if (booksByTranslation.value.has(translationId)) return;
        const next = new Map(booksByTranslation.value);
        next.set(translationId, books);
        booksByTranslation.value = next;
      });
    }
  });

  // A `computed` rather than a plain render-body value: the layout effect below
  // uses it as a dependency, so its identity has to stay stable across renders
  // that did not change a bookmark or a translation's books.
  const chips = useComputed<BookmarkData[]>(() =>
    bookmarks.value.map((bookmark) => {
      const { bookId, chapterNumber, translationId } = bookmark;
      const translationBooks = booksByTranslation.value.get(translationId);
      // Falls back to the raw bookId until the books for this translation load.
      const name =
        translationBooks?.books.find((book) => {
          return book.id === bookId;
        })?.name ?? bookId;

      return {
        name: bookmark.name,
        colorId: bookmark.colorId,
        text: `${name} ${chapterNumber}`,
        handleClick: () => {
          onOpenPassage({ bookId, chapter: chapterNumber, translationId });
        },
        key: bookmark.id,
      };
    })
  );

  // True when the strip has wrapped onto a second line (its
  // `flex-wrap: wrap; overflow: hidden` container clips those rows), which is
  // what puts a "view more" in the section header.
  const isOverflowing = useSignal(false);
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const checkOverflow = () => {
      const strips = root.querySelectorAll<HTMLElement>(
        ".sb-today-bookmarks-section-container"
      );
      isOverflowing.value = Array.from(strips).some((strip) => {
        const children = Array.from(strip.children) as HTMLElement[];
        const firstItemTop = children[0]?.offsetTop;
        if (firstItemTop === undefined) return false;
        return children.some((child) => child.offsetTop > firstItemTop);
      });
    };

    // ResizeObserver catches viewport-driven reflow; the effect dependency
    // below re-measures on content (bookmark) changes.
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(root);
    checkOverflow();

    return () => observer.disconnect();
  }, [chips.value]);

  // Both reads sit in the render body, which is a reactive scope, so the header
  // button appears and disappears as the strip wraps or the viewport crosses the
  // breakpoint (see useReadingHistoryTimeline).
  const showViewMore = isOverflowing.value && !isMobile.value;

  return (
    <TitledSection
      title={t("today-bookmarks", { defaultValue: "BOOKMARKS" })}
      buttonData={
        showViewMore
          ? {
              label: t("view-more", { defaultValue: "VIEW MORE" }),
              onClick: onShowBookmarksList,
            }
          : undefined
      }
    >
      <div className={"sb-today-bookmarks-section"} ref={containerRef}>
        <BookmarkStrip chips={chips.value} />
      </div>
    </TitledSection>
  );
};

function BookmarkStrip(props: { chips: BookmarkData[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Unconditional per Rules of Hooks; a no-op on desktop (no overflow).
  useHorizontalScroll(containerRef);

  return (
    <div className={"sb-today-bookmarks-section-container"} ref={containerRef}>
      {props.chips.map(({ key, ...rest }) => (
        <Bookmark key={key} {...rest} />
      ))}
    </div>
  );
}

function Bookmark(props: {
  name: string;
  colorId: string;
  text: string;
  handleClick: () => void;
}) {
  return (
    <button
      className={"sb-today-bookmarks-section-bookmark sb-today-clickable"}
      onClick={props.handleClick}
    >
      <BookmarkGlyph colorId={props.colorId} size={16} />
      <span className="sb-today-bookmarks-section-bookmark-name">
        {props.name}
      </span>
      <span className="sb-today-bookmarks-section-bookmark-location">
        {props.text}
      </span>
    </button>
  );
}
