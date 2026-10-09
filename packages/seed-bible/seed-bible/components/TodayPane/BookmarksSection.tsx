import {
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { useRef } from "preact/hooks";
import { TitledSection } from "./TitledSection";
import { BookmarkGlyph, BookmarkLabel } from "../Bookmarks/Bookmarks";
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
  chapterText: string;
  translationId: string;
  handleClick: () => void;
}

/**
 * The user's bookmarks on the Today screen, in the order given (most recently
 * moved first). There are at most five, so all of them show; tapping one opens
 * its chapter.
 */
export const BookmarksSection = (props: {
  today: TodayManager;
  bookmarks: ReadonlySignal<BookmarkStripItem[]>;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { bookmarks, onOpenPassage } = props;
  const { getTranslationBooks } = props.today;
  const { t } = useI18n();

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

  const chips: BookmarkData[] = bookmarks.value.map((bookmark) => {
    const { bookId, chapterNumber, translationId } = bookmark;
    const translationBooks = booksByTranslation.value.get(translationId);
    // Falls back to the raw bookId until the books for this translation load.
    const name =
      translationBooks?.books.find((book) => book.id === bookId)?.name ??
      bookId;

    return {
      key: bookmark.id,
      name: bookmark.name,
      colorId: bookmark.colorId,
      chapterText: `${name} ${chapterNumber}`,
      translationId,
      handleClick: () => {
        onOpenPassage({ bookId, chapter: chapterNumber, translationId });
      },
    };
  });

  return (
    <TitledSection title={t("today-bookmarks", { defaultValue: "BOOKMARKS" })}>
      <div className={"sb-today-bookmarks-section"}>
        <BookmarkStrip chips={chips} />
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

function Bookmark(props: Omit<BookmarkData, "key">) {
  return (
    <button
      className={"sb-today-bookmarks-section-bookmark sb-today-clickable"}
      onClick={props.handleClick}
    >
      <BookmarkGlyph colorId={props.colorId} size={16} />
      <BookmarkLabel
        name={props.name}
        chapterText={props.chapterText}
        translationId={props.translationId}
      />
    </button>
  );
}
