import { useSignal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import type { MutableRef } from "preact/hooks";
import type {
  TodayManager,
  TodayPassageTarget,
  VerseSearchResult,
} from "../../managers/TodayManager";
import { useI18n } from "../../i18n";
import { useClickOutside } from "./useClickOutside";

import { useRef, useEffect, useMemo } from "preact/hooks";

type UseSearchBar = (props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  query: ReadonlySignal<string>;
  results: ReadonlySignal<VerseSearchResult[]>;
  loading: ReadonlySignal<boolean>;
  error: ReadonlySignal<string | null>;
  isOpen: ReadonlySignal<boolean>;
  placeholder: string;
  containerRef: MutableRef<HTMLDivElement | null>;
  runSearch: (value: string) => void;
  handleFocus: () => void;
  handleSelect: (result: VerseSearchResult) => void;
};

const DEBOUNCE_MS = 180;

export const useSearchBar: UseSearchBar = ({ today, onOpenPassage }) => {
  const { searchVerses } = today;
  const { t } = useI18n();

  const query = useSignal("");
  const results = useSignal<VerseSearchResult[]>([]);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const isOpen = useSignal(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const placeholder = useMemo(
    () =>
      t("today-search-verses", {
        defaultValue: "Search books, chapter, verses....",
      }),
    [t]
  );

  // `latestRequestRef` guards against out-of-order responses; `debounceTimeoutRef`
  // coalesces keystrokes into a single search.
  const latestRequestRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);

  useClickOutside([containerRef], () => {
    isOpen.value = false;
  });

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const runSearch = (nextQuery: string) => {
    query.value = nextQuery;
    isOpen.value = true;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const trimmed = nextQuery.trim();
    const requestId = ++latestRequestRef.current;

    if (!trimmed) {
      results.value = [];
      loading.value = false;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    debounceTimeoutRef.current = window.setTimeout(() => {
      searchVerses(trimmed)
        .then((found) => {
          if (latestRequestRef.current !== requestId) return;
          results.value = found;
          loading.value = false;
        })
        .catch((err: unknown) => {
          if (latestRequestRef.current !== requestId) return;
          results.value = [];
          loading.value = false;
          error.value =
            err instanceof Error ? err.message : "Unable to search verses.";
        });
    }, DEBOUNCE_MS);
  };

  const handleFocus = () => {
    isOpen.value = true;
  };

  const handleSelect = (result: VerseSearchResult) => {
    // Clear the query before leaving, so reopening Today shows an empty box.
    runSearch("");
    isOpen.value = false;
    onOpenPassage({
      bookId: result.bookId,
      chapter: result.chapterNumber,
      verse: result.verseNumber ?? undefined,
      translationId: result.translationId,
    });
  };

  return {
    query,
    results,
    loading,
    error,
    isOpen,
    placeholder,
    containerRef,
    runSearch,
    handleFocus,
    handleSelect,
  };
};
