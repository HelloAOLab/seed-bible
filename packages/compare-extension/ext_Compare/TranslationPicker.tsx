import { useMemo, useState } from "preact/hooks";
import type { SeedBibleState, Translation } from "seed-bible/managers";
import {
  filterTranslationGroups,
  groupTranslationsByLanguage,
} from "seed-bible/managers";
import {
  FiltersIcon,
  MaterialIcon,
  TranslationList,
  TranslationViewModeMenu,
} from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import {
  addId,
  removeId,
  type CompareOrderEntry,
  type CompareState,
} from "./compareState";

/**
 * Chips for every translation already in the comparison, shown above the
 * search row. Sourced from `state.order`, same as `CompareSettings`. The
 * current translation only gets a remove icon once it's also saved
 * (`savedIndex >= 0`) — until then, clicking it adds rather than removes.
 */
function SelectedTranslations(props: {
  translations: Translation[];
  order: CompareOrderEntry[];
  onToggle: (translation: Translation) => void;
}) {
  const { translations, order, onToggle } = props;
  const { t } = useI18n("compare-extension");

  const entries = order
    .map((entry) => ({
      entry,
      translation:
        translations.find((translation) => translation.id === entry.id) ?? null,
    }))
    .filter(
      (item): item is { entry: CompareOrderEntry; translation: Translation } =>
        item.translation !== null
    );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="sb-compare-picker-selected">
      <span className="sb-compare-picker-note">
        {t("selected-translations", { defaultValue: "Selected" })}
      </span>
      <div className="sb-compare-picker-selected-list">
        {entries.map(({ entry, translation }) => {
          const removable = !entry.isCurrent || entry.savedIndex >= 0;
          const removeLabel = t("remove-translation", {
            defaultValue: "Remove translation",
          });
          return (
            <button
              key={entry.id}
              type="button"
              className="sb-compare-picker-selected-chip"
              aria-label={translation.name}
              title={removable ? removeLabel : translation.name}
              onClick={() => onToggle(translation)}
            >
              <span className="sb-compare-block-abbreviation" dir="auto">
                {translation.shortName}
              </span>
              {removable && (
                <MaterialIcon aria-hidden="true">close</MaterialIcon>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** How many more language groups each "load more" reveals. */
const PAGE_SIZE = 50;

/**
 * Add translations to the comparison.
 *
 * Renders the same `TranslationList` the reader's translation modal uses, so
 * grouping, search and the complete/popular/all filter behave identically. Two
 * deliberate differences: this list is multi-select (a comparison is a set, so
 * picking toggles and you leave with the back arrow rather than the list
 * closing on the first pick), and it omits the reader's per-row offline and
 * share controls.
 *
 * The catalog filter is the reader's own `showAllLanguages` — one user
 * preference for how much of the catalog to show — and this pane has the same
 * control for it, so a reader who wants partial translations here is not stuck
 * with whatever the reader's modal was last set to. The search text stays
 * local, so the two surfaces don't overwrite each other's query.
 */
export function TranslationPicker(props: {
  context: SeedBibleState;
  state: CompareState;
}) {
  const { context, state } = props;
  const { t } = useI18n("compare-extension");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);

  const { showAllLanguages } = context.selector;
  const translations = context.bibleData.availableTranslations.value;
  const selected = state.selectedTranslationIds.value;
  const currentTranslationId = state.currentTranslationId.value;

  // Without memoizing, every keystroke in the search box (and every
  // unrelated re-render) redid the grouping and filtering pass over the
  // whole catalog.
  const allGroups = useMemo(
    () => groupTranslationsByLanguage(translations),
    [translations]
  );
  const { groups, totalMatching } = useMemo(
    () =>
      filterTranslationGroups({
        groups: allGroups,
        query,
        viewMode: showAllLanguages.value,
        limit,
        selectedTranslation:
          translations.find(
            (translation) => translation.id === currentTranslationId
          ) ?? null,
      }),
    [
      allGroups,
      query,
      showAllLanguages.value,
      limit,
      translations,
      currentTranslationId,
    ]
  );

  const toggle = (translation: Translation) => {
    state.setSelectedTranslationIds(
      selected.includes(translation.id)
        ? removeId(selected, translation.id)
        : addId(selected, translation.id)
    );
  };

  return (
    <div className="sb-compare-picker">
      <SelectedTranslations
        translations={translations}
        order={state.order.value}
        onToggle={toggle}
      />

      <div className="sb-compare-picker-search-row">
        <div className="searchbar flex-align-center sb-compare-search">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="search"
            className="flex-1"
            value={query}
            dir="auto"
            placeholder={t("search-translations", {
              defaultValue: "Search translations",
            })}
            aria-label={t("search-translations", {
              defaultValue: "Search translations",
            })}
            onInput={(event: Event) => {
              setQuery((event.currentTarget as HTMLInputElement).value);
            }}
          />
        </div>
        <button
          type="button"
          className="sb-compare-filters-button"
          aria-label={t("filter-translations", {
            defaultValue: "Filter translations",
          })}
          title={t("filter-translations", {
            defaultValue: "Filter translations",
          })}
          aria-expanded={showFilters}
          onClick={() => setShowFilters((open) => !open)}
        >
          <FiltersIcon />
        </button>
        {showFilters && (
          <div className="sb-compare-filters-menu">
            <TranslationViewModeMenu
              viewMode={showAllLanguages.value}
              onChange={(mode) => {
                showAllLanguages.value = mode;
                setShowFilters(false);
                // A narrower or wider catalog is a different list; start it
                // from the first page rather than mid-way through the old one.
                setLimit(PAGE_SIZE);
              }}
            />
          </div>
        )}
      </div>

      <TranslationList
        groups={groups}
        query={query}
        viewMode={showAllLanguages.value}
        // Ticked only once actually saved — same as the chip above. The
        // translation being read is always compared regardless, but showing
        // it ticked before it's saved would give a click on its row nothing
        // to visibly change, even though it silently writes to the saved list.
        selectedTranslationIds={selected}
        expandedLanguage={
          translations
            .find((translation) => translation.id === currentTranslationId)
            ?.language?.toLowerCase() ?? null
        }
        onPick={toggle}
        onShowAllTranslations={() => {
          showAllLanguages.value = "all";
        }}
        // Against what the current filter actually matches, not the whole
        // catalog — most languages have no complete translation, so the
        // catalog total would leave a control that reveals nothing.
        canLoadMore={limit < totalMatching}
        totalGroupCount={totalMatching}
        onLoadMore={() => setLimit((current) => current + PAGE_SIZE)}
      />

      <button
        type="button"
        className="sb-compare-picker-done"
        onClick={() => {
          state.view.value = state.addReturnTo.value;
        }}
      >
        <MaterialIcon>check</MaterialIcon>
        {t("done", { defaultValue: "Done" })}
      </button>
    </div>
  );
}
