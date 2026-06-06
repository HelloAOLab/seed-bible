import { useComputed, useSignal, type ReadonlySignal } from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";
import {} from "@preact/signals";
import type {
  BookmarkData,
  MoreButtonData,
} from "../components/containers/BookmarksSection";
import type { MutableRef } from "preact/hooks";

const { useEffect, useLayoutEffect, useRef } = os.appHooks;

type UseBookmarksSection = () => {
  label: ReadonlySignal<string>;
  bookmarksData: ReadonlySignal<Array<BookmarkData>>;
  moreButtonData: ReadonlySignal<MoreButtonData | undefined>;
  containerRef: MutableRef<HTMLDivElement | null>;
};

export const useBookmarksSection: UseBookmarksSection = () => {
  const { bookmarks, addTab, translate, getTranslationBooks } =
    useTodayContext();
  const translateSignal = useSignal(translate);
  useEffect(() => {
    translateSignal.value = translate;
  }, [translate]);
  const label = useComputed(() => {
    return translateSignal.value("BOOKMARKS");
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bookmarksData = useComputed<Array<BookmarkData>>(() => {
    return bookmarks.value.map((bookmark) => {
      const { bookId, chapterNumber, translationId } = bookmark;
      const translationBooks = getTranslationBooks(translationId);
      const name =
        translationBooks?.books.find((book) => {
          return book.id === bookId;
        })?.name ?? bookId;

      return {
        text: `${name} ${chapterNumber}`,
        handleClick: () => {
          addTab(bookId, chapterNumber, translationId);
        },
        key: bookmark.id,
        // iconName: "home",
        // MaterialIcon
      };
    });
  });

  const isOverflowing = useSignal(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (children.length === 0) {
        isOverflowing.value = false;
        return;
      }

      const firstItemTop = children[0]?.offsetTop;
      if (firstItemTop === undefined) {
        isOverflowing.value = false;
        return;
      }
      const currOverflowing = children.some(
        (child) => child.offsetTop > firstItemTop
      );

      isOverflowing.value = currOverflowing;
    };

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    checkOverflow();

    return () => observer.disconnect();
  }, [bookmarksData.value]);

  const moreButtonData = useComputed<MoreButtonData | undefined>(() => {
    if (!isOverflowing.value) {
      return undefined;
    }

    return {
      handleClick: () => {
        console.log(`useBookmarksSection: Show more bookmarks`);
      },
      text: translateSignal.value("VIEW-MORE"),
    };
  });

  return {
    label,
    bookmarksData,
    moreButtonData,
    containerRef,
  };
};
