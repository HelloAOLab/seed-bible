import { useMemo, useState } from "preact/hooks";
import type { SeedBibleState, Translation } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import { addId, type CompareState } from "./compareState";

interface LanguageGroup {
  language: string;
  languageName: string;
  translations: Translation[];
}

function languageLabel(translation: Translation): string {
  return (
    translation.languageEnglishName ||
    translation.languageName ||
    translation.language
  );
}

/** Matches the fields the Bible selector's own translation search matches on. */
function matchesQuery(translation: Translation, query: string): boolean {
  if (!query) {
    return true;
  }
  return [
    translation.shortName,
    translation.name,
    translation.englishName,
    languageLabel(translation),
  ].some((field) => field?.toLowerCase().includes(query));
}

function groupByLanguage(translations: Translation[]): LanguageGroup[] {
  const groups = new Map<string, LanguageGroup>();

  for (const translation of translations) {
    const existing = groups.get(translation.language);
    if (existing) {
      existing.translations.push(translation);
      continue;
    }
    groups.set(translation.language, {
      language: translation.language,
      languageName: languageLabel(translation),
      translations: [translation],
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.languageName.localeCompare(b.languageName)
  );
}

/**
 * Searchable list of every available translation.
 *
 * The translation being read is *not* disabled here even though it always shows
 * in the comparison — adding it is how a reader keeps it around after switching
 * the reader to something else.
 */
export function TranslationPicker(props: {
  context: SeedBibleState;
  state: CompareState;
  onDone: () => void;
}) {
  const { context, state, onDone } = props;
  const { t } = useI18n("compare-extension");
  const [query, setQuery] = useState("");

  const translations = context.bibleData.availableTranslations.value;
  const selected = state.selectedTranslationIds.value;
  const currentTranslationId = state.currentTranslationId.value;

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return groupByLanguage(
      translations.filter((translation) =>
        matchesQuery(translation, normalized)
      )
    );
  }, [translations, query]);

  const add = (translationId: string) => {
    state.setSelectedTranslationIds(addId(selected, translationId));
    onDone();
  };

  return (
    <div className="sb-compare-picker">
      <input
        type="search"
        className="sb-settings-text-input sb-compare-search"
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

      {groups.map((group) => (
        <section key={group.language} className="sb-discover-section">
          <h3 className="sb-discover-section-title" dir="auto">
            {group.languageName}
          </h3>
          <ul className="sb-discover-list">
            {group.translations.map((translation) => {
              const isSelected = selected.includes(translation.id);
              return (
                <li
                  key={translation.id}
                  className="sb-discover-item sb-discover-item--row"
                >
                  <button
                    type="button"
                    className="sb-discover-item-button sb-compare-picker-option"
                    disabled={isSelected}
                    onClick={() => add(translation.id)}
                  >
                    <span className="sb-compare-block-abbreviation" dir="auto">
                      {translation.shortName}
                    </span>
                    <span className="sb-discover-item-title" dir="auto">
                      {translation.name}
                    </span>
                    {translation.id === currentTranslationId && (
                      <span className="sb-compare-picker-note">
                        {t("currently-reading", {
                          defaultValue: "Currently reading",
                        })}
                      </span>
                    )}
                    {isSelected && <MaterialIcon>check</MaterialIcon>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
