import "./DiscoverContentPanel.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import { hasAnyDiscoverResults } from "../../managers/BibleReadingManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
} from "../DiscoverPane/DiscoveredResultsSections";
import { AnnotationsSection } from "../DiscoverPane/AnnotationsSection";
import { MaterialIcon } from "../icons";
import {
  getReadingPlansForChapter,
  ReadingPlansSection,
} from "../ReadingPlansSection/ReadingPlansSection";

type FilterKey =
  | "all"
  | "annotations"
  | "cross-references"
  | "study-notes"
  | "content";

interface DiscoverContentPanelProps {
  tab: ReaderTab | null;
  state: SeedBibleState;
}

/**
 * Automatically-visible discover content — the reader's own notes
 * (annotations) plus discovered cross references/study notes/content — for
 * one reading tab. Rendered once per visible tab. Hides itself entirely when
 * there's no tab or there's nothing to show for the chapter; otherwise always
 * renders — the "discover-content-panel" quick tool only controls whether the
 * caller places it beside the scripture text or below it (see BibleReader).
 */
export function DiscoverContentPanel(props: DiscoverContentPanelProps) {
  const { tab, state } = props;
  const { t } = useI18n();
  const activeFilter = useSignal<FilterKey>("all");

  if (!tab) {
    return null;
  }

  const bookId = tab.readingState.bookId.value;
  const chapterNumber = tab.readingState.chapterNumber.value;
  const hasAnnotations = Boolean(
    bookId &&
    chapterNumber &&
    state.annotations.getAnnotationsForChapter(bookId, chapterNumber).value
      .length > 0
  );
  const plans = getReadingPlansForChapter(state, tab.readingState);

  if (
    !hasAnnotations &&
    !hasAnyDiscoverResults(tab.readingState) &&
    plans.length === 0
  ) {
    return null;
  }

  const bookName =
    tab.readingState.chapterData.value?.book.commonName ??
    tab.readingState.chapterData.value?.book.name ??
    bookId ??
    "";

  const hasCrossReferences =
    tab.readingState.discoveredCrossReferences.value.flatMap(
      (group) => group.results
    ).length > 0;
  const hasStudyNotes =
    tab.readingState.discoveredStudyNotes.value.flatMap(
      (group) => group.results
    ).length > 0;
  const hasContent =
    tab.readingState.discoveredContent.value.flatMap((group) => group.results)
      .length > 0;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("all", { defaultValue: "All" }) },
    ...(hasAnnotations
      ? [
          {
            key: "annotations" as const,
            label: t("notes", { defaultValue: "Notes" }),
          },
        ]
      : []),
    ...(hasCrossReferences
      ? [
          {
            key: "cross-references" as const,
            label: t("cross-references", { defaultValue: "Cross Refs" }),
          },
        ]
      : []),
    ...(hasStudyNotes
      ? [
          {
            key: "study-notes" as const,
            label: t("study-notes", { defaultValue: "Study Notes" }),
          },
        ]
      : []),
    ...(hasContent
      ? [
          {
            key: "content" as const,
            label: t("content", { defaultValue: "Content" }),
          },
        ]
      : []),
  ];

  // Falls back to "all" when the previously-active filter's content type is
  // no longer available (e.g. the user filtered to "Cross Refs" then
  // navigated to a chapter with none), so the chip row and content area don't
  // go blank.
  const f = filters.some((filter) => filter.key === activeFilter.value)
    ? activeFilter.value
    : "all";

  return (
    <div className="sb-bible-reader-discover-panel">
      <div
        className="sb-discover-content-panel"
        aria-label={t("discover-content-panel", {
          defaultValue: "Discover content",
        })}
      >
        <div className="sb-dcp-header">
          <div className="sb-dcp-header-title">
            <MaterialIcon className="sb-dcp-header-icon">explore</MaterialIcon>
            <span>
              {t("discover-book-title", {
                defaultValue: "Discover {{book}}",
                book: bookName,
              })}
            </span>
          </div>
          <button
            type="button"
            className="sb-dcp-create-btn"
            onClick={() => void state.annotations.createNewAnnotation()}
          >
            + {t("create-playlist", { defaultValue: "Create" })}
          </button>
        </div>

        {filters.length > 2 && (
          <div style={{ display: "contents" }}>
            <div className="sb-dcp-filters" role="tablist">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={f === key}
                  className={`sb-dcp-chip${f === key ? " sb-dcp-chip--active" : ""}`}
                  onClick={() => (activeFilter.value = key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sb-discover-content-panel-scroll">
          {(f === "all" || f === "annotations") && (
            <AnnotationsSection
              tab={tab}
              annotations={state.annotations}
              modals={state.modals}
              toast={state.app.toast}
              login={state.login}
              tabs={state.tabs}
              discover={state.discover}
              panes={state.panes}
              onReferenceClick={state.app.openVerseReference}
            />
          )}
          {(f === "all" || f === "cross-references") && (
            <CrossReferencesSection tab={tab} />
          )}
          {(f === "all" || f === "study-notes") && (
            <StudyNotesSection tab={tab} />
          )}
          {(f === "all" || f === "content") && <ContentSection tab={tab} />}
          {f === "all" && plans.length > 0 && (
            <ReadingPlansSection
              readingState={tab.readingState}
              state={state}
              plans={plans}
            />
          )}
        </div>

        <button
          type="button"
          className="sb-dcp-show-all"
          onClick={() => state.app.openDiscover()}
        >
          {t("show-all", { defaultValue: "Show All" })}
        </button>
      </div>
    </div>
  );
}
