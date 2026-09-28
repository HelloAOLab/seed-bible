import { useSignal, type ReadonlySignal } from "@preact/signals";
import { useRef, useEffect } from "preact/hooks";
import { TitledSection } from "./TitledSection";
import { useClickOutside } from "../useClickOutside";
import { MaterialIcon, SeedBibleIcon } from "../icons";
import { useI18n } from "../../i18n";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
  VerseSearchResult,
} from "../../managers/TodayManager";

export const SearchSection = (props: {
  today: TodayManager;
  theme: ReadonlySignal<BibleTheme>;
  isMobile: ReadonlySignal<boolean>;
  onOpenBookSelector: () => void;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const { t } = useI18n();
  // Both read here in the render body, which is a reactive scope, so a theme
  // switch or a breakpoint crossing restyles the icon immediately (see
  // useReadingHistoryTimeline).
  const theme = props.theme.value;
  const isMobile = props.isMobile.value;
  const iconSize = isMobile ? "1.25rem" : "1.5rem";

  return (
    <TitledSection
      title={t("go-somewhere-new", { defaultValue: "GO SOMEWHERE NEW" })}
    >
      <div className="sb-today-search-container">
        <button
          className="sb-today-book-selector-button sb-today-clickable"
          type="button"
          onClick={props.onOpenBookSelector}
        >
          <SeedBibleIcon
            className="sb-today-seed-bible-icon"
            style={{
              width: iconSize,
              height: iconSize,
              fill: theme.variables.secondaryFontColor,
            }}
          />
          {t("books", { defaultValue: "Books" })}
        </button>
        <SearchBar today={props.today} onOpenPassage={props.onOpenPassage} />
      </div>
    </TitledSection>
  );
};

const DEBOUNCE_MS = 180;

function SearchBar(props: {
  today: TodayManager;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) {
  const { searchVerses } = props.today;
  const { t } = useI18n();

  const query = useSignal("");
  const results = useSignal<VerseSearchResult[]>([]);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const isOpen = useSignal(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const handleSelect = (result: VerseSearchResult) => {
    // Clear the query before leaving, so reopening Today shows an empty box.
    runSearch("");
    isOpen.value = false;
    props.onOpenPassage({
      bookId: result.bookId,
      chapter: result.chapterNumber,
      verse: result.verseNumber ?? undefined,
      translationId: result.translationId,
    });
  };

  const showDropdown = isOpen.value && query.value.trim().length > 0;

  return (
    <div className="sb-today-searchbar" ref={containerRef}>
      <MaterialIcon>search</MaterialIcon>
      <input
        type="text"
        placeholder={t("today-search-verses", {
          defaultValue: "Search books, chapters, verses...",
        })}
        value={query.value}
        onInput={(e) => runSearch((e.target as HTMLInputElement).value)}
        onFocus={() => {
          isOpen.value = true;
        }}
      />
      {showDropdown && (
        <div className="sb-today-searchbar-dropdown">
          {loading.value && (
            <div className="sb-today-searchbar-status">
              {t("searching", { defaultValue: "Searching..." })}
            </div>
          )}

          {!loading.value && error.value && (
            <div className="sb-today-searchbar-status sb-today-searchbar-status-error">
              {error.value}
            </div>
          )}

          {!loading.value && !error.value && results.value.length === 0 && (
            <div className="sb-today-searchbar-status">
              {t("no-search-results", {
                defaultValue: "No matching verses.",
              })}
            </div>
          )}

          {!loading.value &&
            !error.value &&
            results.value.map((result) => (
              <button
                key={result.id}
                type="button"
                className="sb-today-searchbar-result"
                onClick={() => handleSelect(result)}
              >
                <span className="sb-today-searchbar-result-ref">
                  {result.reference}
                </span>
                <span className="sb-today-searchbar-result-text">
                  {result.text}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
