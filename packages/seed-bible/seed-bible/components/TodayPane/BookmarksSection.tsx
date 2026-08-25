import {
  useComputed,
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useLayoutEffect, useRef } from "preact/hooks";
import { TitledSection } from "./TitledSection";
import { BookmarkIcon } from "../icons";
import { useHorizontalScroll } from "../useHorizontalScroll";
import { useI18n } from "../../i18n";
import type { TranslationBooks } from "../../managers/FreeUseBibleAPI";
import {
  getBookmarkCategories,
  type Bookmark as BookmarkRecord,
} from "../../managers/BookmarksManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

/** One bookmark chip: its label, and where tapping it goes. */
interface BookmarkData {
  key: string;
  text: string;
  handleClick: () => void;
}

/** Bookmarks grouped by category name, in first-appearance order. */
type CategorizedBookmarks = Map<string, BookmarkData[]>;

export const BookmarksSection = (props: {
  today: TodayManager;
  bookmarks: ReadonlySignal<BookmarkRecord[]>;
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
  const categorizedBookmarks = useComputed<CategorizedBookmarks>(() => {
    // A Map preserves first-appearance order for every category name (a plain
    // object would hoist integer-like keys such as "2024" to the front).
    const categorized: CategorizedBookmarks = new Map();
    for (const bookmark of bookmarks.value) {
      const { bookId, chapterNumber, translationId, category } = bookmark;
      const translationBooks = booksByTranslation.value.get(translationId);
      // Falls back to the raw bookId until the books for this translation load.
      const name =
        translationBooks?.books.find((book) => {
          return book.id === bookId;
        })?.name ?? bookId;

      const data: BookmarkData = {
        text: `${name} ${chapterNumber}`,
        handleClick: () => {
          onOpenPassage({ bookId, chapter: chapterNumber, translationId });
        },
        key: bookmark.id,
      };

      // A bookmark can belong to several folders, so it shows up under each.
      for (const categoryName of getBookmarkCategories(category)) {
        let categoryBookmarks = categorized.get(categoryName);
        if (!categoryBookmarks) {
          categoryBookmarks = [];
          categorized.set(categoryName, categoryBookmarks);
        }
        categoryBookmarks.push(data);
      }
    }
    return categorized;
  });

  // True when any category's strip has wrapped onto a second line (its
  // `flex-wrap: wrap; overflow: hidden` container clips those rows). Measured
  // from the single section ref so one "view more" can live in the header,
  // instead of one per row.
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
  }, [categorizedBookmarks.value]);

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
        {Array.from(categorizedBookmarks.value.entries()).map(
          ([category, bookmarksData]) => (
            <BookmarksCategory
              key={category}
              label={`${category}:`}
              bookmarksData={bookmarksData}
            />
          )
        )}
      </div>
    </TitledSection>
  );
};

function BookmarksCategory(props: {
  label: string;
  bookmarksData: BookmarkData[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Unconditional per Rules of Hooks; a no-op on desktop (no overflow).
  useHorizontalScroll(containerRef);

  return (
    <div>
      <h5 className={"sb-today-bookmarks-section-label"}>{props.label}</h5>
      <div
        className={"sb-today-bookmarks-section-container"}
        ref={containerRef}
      >
        {props.bookmarksData.map(({ key, ...rest }) => (
          <Bookmark key={key} {...rest} />
        ))}
      </div>
    </div>
  );
}

function Bookmark(props: { text: string; handleClick: () => void }) {
  return (
    <button
      className={"sb-today-bookmarks-section-bookmark sb-today-clickable"}
      onClick={props.handleClick}
    >
      {/*
        A heavier stroke than core's default, which is what gives the chip its
        chunky look at this size. Colour comes from the button's own `color`
        through `currentColor`.
      */}
      <BookmarkIcon
        width="16"
        height="16"
        stroke-width="3"
        aria-hidden="true"
      />
      {props.text}
    </button>
  );
}
