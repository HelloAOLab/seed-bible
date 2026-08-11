import { useSignal } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import type { MutableRef } from "preact/hooks";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useClickOutside } from "./useClickOutside";
import type { VerseSearchResult } from "../../../domain/models/search";

import { useRef, useEffect, useMemo } from "preact/hooks";

type UseSearchBar = () => {
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
  translate: (key: string, options?: Record<string, unknown>) => string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

const DEBOUNCE_MS = 180;

export const useSearchBar: UseSearchBar = () => {
  const { searchVerses, addTab, closeToday, translate, MaterialIcon } =
    useTodayContext();

  const query = useSignal("");
  const results = useSignal<VerseSearchResult[]>([]);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const isOpen = useSignal(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const placeholder = useMemo(() => translate("search-verses"), [translate]);

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
    addTab(
      result.bookId,
      result.chapterNumber,
      result.translationId,
      result.verseNumber ?? undefined
    );
    runSearch("");
    isOpen.value = false;
    closeToday();
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
    translate,
    MaterialIcon,
  };
};
