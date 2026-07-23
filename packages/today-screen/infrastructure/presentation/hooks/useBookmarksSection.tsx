import {
  useComputed,
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import type { CategorizedBookmarks } from "../components/containers/BookmarksSection";
import type { MutableRef } from "preact/hooks";
import type { TranslationBooks } from "../../../../seed-bible/seed-bible/managers/FreeUseBibleAPI";

import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

type MoreButtonData = { label: string; onClick: () => void };

type UseBookmarksSection = () => {
  label: ReadonlySignal<string>;
  categorizedBookmarks: ReadonlySignal<CategorizedBookmarks>;
  moreButtonData: ReadonlySignal<MoreButtonData | undefined>;
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useBookmarksSection: UseBookmarksSection = () => {
  const {
    bookmarks,
    addTab,
    closeToday,
    translate,
    getTranslationBooks,
    showBookmarksList,
  } = useTodayContext();
  const translateSignal = useSignal(translate);
  useEffect(() => {
    translateSignal.value = translate;
  }, [translate]);
  const label = useComputed(() => {
    return translateSignal.value("BOOKMARKS");
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reactive cache of translation → books. `getTranslationBooks` is async
  // (it fetches + caches on miss), so we resolve book names here and recompute
  // `bookmarksData` as each translation's books arrive.
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

  const categorizedBookmarks = useComputed<CategorizedBookmarks>(() => {
    // A Map preserves first-appearance order for every category name (a plain
    // object would hoist integer-like keys such as "2024" to the front).
    const categorized: CategorizedBookmarks = new Map();
    for (const bookmark of bookmarks.value) {
      const { bookId, chapterNumber, translationId, category } = bookmark;
      let categoryBookmarks = categorized.get(category);
      if (!categoryBookmarks) {
        categoryBookmarks = [];
        categorized.set(category, categoryBookmarks);
      }
      const translationBooks = booksByTranslation.value.get(translationId);
      // Falls back to the raw bookId until the books for this translation load.
      const name =
        translationBooks?.books.find((book) => {
          return book.id === bookId;
        })?.name ?? bookId;

      const data = {
        text: `${name} ${chapterNumber}`,
        handleClick: () => {
          addTab(bookId, chapterNumber, translationId);
          closeToday();
        },
        key: bookmark.id,
      };
      categoryBookmarks.push(data);
    }
    return categorized;
  });

  // True when any category's strip has wrapped onto a second line (its
  // `flex-wrap: wrap; overflow: hidden` container clips those rows). Measured
  // from the single section ref so one "view more" can live in the header,
  // instead of one per row. Same criterion as `useCategorizedBookmarks`.
  const isOverflowing = useSignal(false);
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const checkOverflow = () => {
      const strips = root.querySelectorAll<HTMLElement>(
        ".bookmarks-section-container"
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

  const moreButtonData = useComputed<MoreButtonData | undefined>(() => {
    if (!isOverflowing.value) {
      return undefined;
    }
    return {
      label: translateSignal.value("VIEW-MORE"),
      onClick: () => {
        showBookmarksList();
      },
    };
  });

  return {
    label,
    categorizedBookmarks,
    moreButtonData,
    containerRef,
  };
};
