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

import { useEffect, useRef } from "preact/hooks";

type UseBookmarksSection = () => {
  label: ReadonlySignal<string>;
  categorizedBookmarks: ReadonlySignal<CategorizedBookmarks>;
  // moreButtonData: ReadonlySignal<MoreButtonData | undefined>;
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useBookmarksSection: UseBookmarksSection = () => {
  const { bookmarks, addTab, closeToday, translate, getTranslationBooks } =
    useTodayContext();
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
    const categorized: CategorizedBookmarks = {};
    for (const bookmark of bookmarks.value) {
      const { bookId, chapterNumber, translationId, category } = bookmark;
      if (!categorized[category]) {
        categorized[category] = [];
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
      categorized[category].push(data);
    }
    return categorized;
  });

  // const isOverflowing = useSignal(false);
  // useLayoutEffect(() => {
  //   const container = containerRef.current;
  //   if (!container) return;

  //   const checkOverflow = () => {
  //     const children = Array.from(container.children) as HTMLElement[];
  //     if (children.length === 0) {
  //       isOverflowing.value = false;
  //       return;
  //     }

  //     const firstItemTop = children[0]?.offsetTop;
  //     if (firstItemTop === undefined) {
  //       isOverflowing.value = false;
  //       return;
  //     }
  //     const currOverflowing = children.some(
  //       (child) => child.offsetTop > firstItemTop
  //     );

  //     isOverflowing.value = currOverflowing;
  //   };

  //   const observer = new ResizeObserver(checkOverflow);
  //   observer.observe(container);
  //   checkOverflow();

  //   return () => observer.disconnect();
  // }, [categorizedBookmarks.value]);

  // const moreButtonData = useComputed<MoreButtonData | undefined>(() => {
  //   if (!isOverflowing.value) {
  //     return undefined;
  //   }

  //   return {
  //     handleClick: () => {
  //       console.log(`useBookmarksSection: Show more bookmarks`);
  //     },
  //     text: translateSignal.value("VIEW-MORE"),
  //   };
  // });

  return {
    label,
    categorizedBookmarks,
    // moreButtonData,
    containerRef,
  };
};
