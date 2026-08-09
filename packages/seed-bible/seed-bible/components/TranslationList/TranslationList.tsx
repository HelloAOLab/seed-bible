import "./TranslationList.css";
import { useEffect, useMemo, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import type { ComponentChild } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import { TickIcon } from "../icons";
import type { Translation } from "../../managers/FreeUseBibleAPI";
import type {
  TranslationLanguageGroup,
  TranslationViewMode,
} from "../../managers/translationGrouping";

export interface TranslationListProps {
  /** Language groups to show, already searched/filtered/limited. */
  groups: TranslationLanguageGroup[];
  /** Current search text. Drives whether groups start expanded. */
  query: string;
  /** Which slice of the catalog is being shown. */
  viewMode: TranslationViewMode;
  /** Ids rendered as chosen (ticked). One for the reader, many for Compare. */
  selectedTranslationIds: string[];
  /** Invoked when a translation row is activated. */
  onPick: (translation: Translation) => void;
  /**
   * Switches the view mode to "all". Shown as a button when a narrowed view
   * produced no results, so the reader can widen the search in place.
   */
  onShowAllTranslations: () => void;
  /** Reveals the next page of language groups. Omit to hide the control. */
  onLoadMore?: () => void;
  /** Whether more language groups exist beyond the current limit. */
  canLoadMore?: boolean;
  /**
   * Language whose group starts expanded (typically the chosen translation's).
   * A group is also auto-expanded while searching, or when it is the only one.
   */
  expandedLanguage?: string | null;
  /** Extra controls rendered at the end of a translation row. */
  renderActions?: (translation: Translation) => ComponentChild;
  /** Shows the license/info affordance for translations that carry a notice. */
  onShowInfo?: (translation: Translation, event: MouseEvent) => void;
  /** Called when the list is scrolled — used to dismiss anchored popovers. */
  onScroll?: () => void;
}

/**
 * The translation picker's list: one collapsible section per language, with
 * that language's translations underneath.
 *
 * Shared by the reader's translation modal and the Compare pane so both search,
 * group, sort and render translations identically. Everything specific to a
 * surface stays outside: the reader supplies its offline/share row actions
 * through `renderActions` and keeps its own modal chrome, filter popover and
 * custom-translation form.
 */
export function TranslationList(props: TranslationListProps) {
  const {
    groups,
    query,
    viewMode,
    selectedTranslationIds,
    onPick,
    onShowAllTranslations,
    onLoadMore,
    canLoadMore = false,
    expandedLanguage = null,
    renderActions,
    onShowInfo,
    onScroll,
  } = props;
  const { t } = useI18n();

  const hasResults = groups.length > 0;

  // A narrowed view with nothing in it offers to widen itself; "all" with
  // nothing in it has nowhere left to go.
  if (!hasResults) {
    if (viewMode === "complete" || viewMode === "popular") {
      return (
        <div className="sb-translation-list sb-translation-list-empty">
          <span>
            {t("no-translation-results-found", {
              defaultValue:
                "No results found. Would you like to expand your search to include partial and incomplete translations as well?",
            })}
          </span>
          <button
            onClick={onShowAllTranslations}
            className="sb-translation-list-expand-button"
          >
            {t("show-all-translations", {
              defaultValue: "Show all translations",
            })}
          </button>
        </div>
      );
    }

    return (
      <div className="sb-translation-list">
        <span>
          {t("no-results-found", { defaultValue: "No results found." })}
        </span>
      </div>
    );
  }

  return (
    <div className="sb-translation-list" onScroll={onScroll}>
      {groups.map((group) => (
        <TranslationLanguageSection
          key={group.language}
          group={group}
          query={query}
          viewMode={viewMode}
          groupCount={groups.length}
          selectedTranslationIds={selectedTranslationIds}
          expandedLanguage={expandedLanguage}
          onPick={onPick}
          renderActions={renderActions}
          onShowInfo={onShowInfo}
        />
      ))}
      {canLoadMore && onLoadMore && (
        <div
          className="sb-translation-list-language flex-between sb-translation-list-load-more"
          onClick={onLoadMore}
        >
          <span className="material-symbols-outlined sb-translation-list-chevron">
            expand_more
          </span>
        </div>
      )}
    </div>
  );
}

function TranslationLanguageSection(props: {
  group: TranslationLanguageGroup;
  query: string;
  viewMode: TranslationViewMode;
  groupCount: number;
  selectedTranslationIds: string[];
  expandedLanguage: string | null;
  onPick: (translation: Translation) => void;
  renderActions?: (translation: Translation) => ComponentChild;
  onShowInfo?: (translation: Translation, event: MouseEvent) => void;
}) {
  const {
    group,
    query,
    viewMode,
    groupCount,
    selectedTranslationIds,
    expandedLanguage,
    onPick,
    renderActions,
    onShowInfo,
  } = props;
  const {
    language,
    languageName: nativeLanguageName,
    languageEnglishName,
    translations,
  } = group;
  const { t } = useI18n();

  const showRef = useRef<ReturnType<typeof signal<boolean>> | null>(null);
  if (!showRef.current) showRef.current = signal(false);
  const showSig = showRef.current;

  useEffect(() => {
    if (query.length > 0) {
      showSig.value = true;
    } else if (groupCount === 1) {
      showSig.value = true;
    } else if (expandedLanguage === language.toLowerCase()) {
      showSig.value = true;
    } else {
      showSig.value = false;
    }
  }, [query, groupCount, expandedLanguage, language]);

  const firstSelectedId = selectedTranslationIds[0];
  const sortedTranslations = useMemo(() => {
    if (!showSig.value) {
      return [];
    }
    return [...translations].sort((a, b) => {
      if (a.id === firstSelectedId) return -1;
      if (b.id === firstSelectedId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [translations, firstSelectedId, showSig.value]);

  return (
    <>
      <div
        className="sb-translation-list-language flex-between"
        onClick={() => {
          showSig.value = !showSig.value;
        }}
        style={{
          backgroundColor: showSig.value ? "" : "var(--sb-background)",
          marginBottom: showSig.value ? "0px" : "0.625rem",
          gap: "0.5rem",
        }}
      >
        <span style={{ textTransform: "capitalize", flex: "1 1 auto" }}>
          {nativeLanguageName}
        </span>
        {language !== "eng" &&
          nativeLanguageName !== languageEnglishName &&
          languageEnglishName && (
            <span className="sb-language-english-name">
              ({languageEnglishName})
            </span>
          )}
        <span
          className={`material-symbols-outlined sb-translation-list-chevron ${
            showSig.value ? "sb-translation-list-chevron--open" : ""
          }`}
          // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
        >
          expand_more
        </span>
      </div>
      {showSig.value && (
        <div style={{ margin: "0.3125rem 0.3125rem" }}>
          {sortedTranslations.map((value) => {
            const isSelected = selectedTranslationIds.includes(value.id);
            const completionPercentage = Math.ceil(
              (value.numberOfBooks / 66) * 100
            );
            const rotation = (completionPercentage / 100) * 360;

            return (
              <div
                key={value.id}
                onClick={() => onPick(value)}
                style={{
                  background: isSelected
                    ? "color-mix(in srgb, var(--pageBookBackground) 50%, transparent)"
                    : "var(--sb-background)",
                }}
                className="translation-option flex-between-center-gap-md"
              >
                <span className="translation-title inline-flex-start-center-gap-sm">
                  {isSelected ? (
                    <TickIcon height={15} width={15} />
                  ) : viewMode === "all" || viewMode === "popular" ? (
                    <span
                      className="emptyCircle"
                      style={{
                        background: `linear-gradient(white, white) padding-box, conic-gradient(from -${rotation}deg, var(--sb-primary-color) ${completionPercentage}%, #eee 0) border-box`,
                      }}
                    ></span>
                  ) : (
                    <span className="emptyCircle"></span>
                  )}
                  <span className="translation-description">{`${value.name} (${value.shortName})`}</span>
                  {value?.licenseNotice && onShowInfo && (
                    <span
                      style={{ display: "flex" }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        onShowInfo(value, event);
                      }}
                      title={t("information-about-this-translation", {
                        defaultValue: "Information about this translation",
                      })}
                    >
                      <span
                        style={{ fontSize: "1.125rem" }}
                        className="material-symbols-outlined"
                        // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
                      >
                        info
                      </span>
                    </span>
                  )}
                </span>
                {renderActions && (
                  <span className="sb-translation-list-actions inline-flex-start-center-gap-sm">
                    {renderActions(value)}
                  </span>
                )}
              </div>
            );
          })}
          <div
            className="sb-translation-list-separator"
            style={{ width: "100%" }}
          ></div>
        </div>
      )}
    </>
  );
}
