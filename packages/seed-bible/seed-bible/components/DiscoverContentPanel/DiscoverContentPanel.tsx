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

type FilterKey =
  | "all"
  | "annotations"
  | "cross-references"
  | "study-notes"
  | "content";

interface DiscoverContentPanelProps {
  tab: ReaderTab | null;
  state: SeedBibleState;
  /**
   * "side" docks the panel beside the reader with its own scroll region;
   * "inline" flows the panel inside the reader's own scroll viewport. Chosen
   * per-slot by the caller based on available space (see `TabsLayout.tsx`).
   */
  variant: "side" | "inline";
}

/**
 * Automatically-visible discover content — the reader's own notes
 * (annotations) plus discovered cross references/study notes/content — for
 * one reading tab. Rendered once per visible tab, in whichever `variant` its
 * slot has room for. Hides itself entirely when there's no tab, the tab's
 * toggle is off, or there's nothing to show for the chapter.
 */
export function DiscoverContentPanel(props: DiscoverContentPanelProps) {
  const { tab, state, variant } = props;
  const { t } = useI18n();
  const activeFilter = useSignal<FilterKey>("all");

  if (!tab) {
    return null;
  }
  if (!tab.readingState.discoverContentPanelVisible.value) {
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
  if (!hasAnnotations && !hasAnyDiscoverResults(tab.readingState)) {
    return null;
  }

  const bookName =
    tab.readingState.chapterData.value?.book.commonName ??
    tab.readingState.chapterData.value?.book.name ??
    bookId ??
    "";

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("all", { defaultValue: "All" }) },
    { key: "annotations", label: t("notes", { defaultValue: "Notes" }) },
    {
      key: "cross-references",
      label: t("cross-references", { defaultValue: "Cross Refs" }),
    },
    {
      key: "study-notes",
      label: t("study-notes", { defaultValue: "Study Notes" }),
    },
    { key: "content", label: t("content", { defaultValue: "Content" }) },
  ];

  const f = activeFilter.value;

  return (
    <div
      className={`sb-discover-content-panel sb-discover-content-panel--${variant}`}
      aria-label={t("discover-content-panel", {
        defaultValue: "Discover content",
      })}
    >
      {variant === "side" && (
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
      )}

      {variant === "side" && (
        <div className="sb-dcp-filters" role="tablist">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeFilter.value === key}
              className={`sb-dcp-chip${activeFilter.value === key ? " sb-dcp-chip--active" : ""}`}
              onClick={() => (activeFilter.value = key)}
            >
              {label}
            </button>
          ))}
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
      </div>

      {variant === "side" && (
        <button
          type="button"
          className="sb-dcp-show-all"
          onClick={() => state.app.openDiscover()}
        >
          {t("show-all", { defaultValue: "Show All" })}
        </button>
      )}
    </div>
  );
}
