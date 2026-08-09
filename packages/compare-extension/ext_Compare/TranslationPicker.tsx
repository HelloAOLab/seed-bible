import { useState } from "preact/hooks";
import type { SeedBibleState, Translation } from "seed-bible/managers";
import {
  filterTranslationGroups,
  groupTranslationsByLanguage,
} from "seed-bible/managers";
import { MaterialIcon, TranslationList } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { addId, removeId, type CompareState } from "./compareState";

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
 * The catalog filter is read from the reader's own `showAllLanguages` — it is
 * one user preference for how much of the catalog to show, so changing it here
 * changes it there too. The search text stays local, so the two surfaces don't
 * overwrite each other's query.
 */
export function TranslationPicker(props: {
  context: SeedBibleState;
  state: CompareState;
}) {
  const { context, state } = props;
  const { t } = useI18n("compare-extension");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { showAllLanguages } = context.selector;
  const translations = context.bibleData.availableTranslations.value;
  const selected = state.selectedTranslationIds.value;
  const currentTranslationId = state.currentTranslationId.value;

  const allGroups = groupTranslationsByLanguage(translations);
  const groups = filterTranslationGroups({
    groups: allGroups,
    query,
    viewMode: showAllLanguages.value,
    limit,
    selectedTranslation:
      translations.find(
        (translation) => translation.id === currentTranslationId
      ) ?? null,
  });

  const toggle = (translation: Translation) => {
    state.setSelectedTranslationIds(
      selected.includes(translation.id)
        ? removeId(selected, translation.id)
        : addId(selected, translation.id)
    );
  };

  return (
    <div className="sb-compare-picker">
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

      <TranslationList
        groups={groups}
        query={query}
        viewMode={showAllLanguages.value}
        // The translation being read is always part of the comparison, so it
        // reads as chosen here even though it is never saved.
        selectedTranslationIds={
          currentTranslationId && !selected.includes(currentTranslationId)
            ? [...selected, currentTranslationId]
            : selected
        }
        expandedLanguage={
          translations
            .find((translation) => translation.id === currentTranslationId)
            ?.language?.toLowerCase() ?? null
        }
        onPick={toggle}
        onShowAllTranslations={() => {
          showAllLanguages.value = "all";
        }}
        canLoadMore={limit < allGroups.length && groups.length >= PAGE_SIZE}
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
