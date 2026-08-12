import "./DiscoverContentPanel.css";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import { hasAnyDiscoverResults } from "../../managers/BibleReadingManager";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
} from "../DiscoverPane/DiscoveredResultsSections";

interface DiscoverContentPanelProps {
  tab: ReaderTab | null;
  /**
   * "side" docks the panel beside the reader with its own scroll region;
   * "inline" flows the panel inside the reader's own scroll viewport. Chosen
   * per-slot by the caller based on available space (see `TabsLayout.tsx`).
   */
  variant: "side" | "inline";
}

/**
 * Automatically-visible discover content (cross references/study notes/
 * content) for one reading tab. Rendered once per visible tab, in whichever
 * `variant` its slot has room for. Hides itself entirely when there's no tab,
 * the tab's toggle is off, or there's nothing discovered for the chapter.
 */
export function DiscoverContentPanel(props: DiscoverContentPanelProps) {
  const { tab, variant } = props;
  const { t } = useI18n();

  if (!tab) {
    return null;
  }
  if (!tab.readingState.discoverContentPanelVisible.value) {
    return null;
  }
  if (!hasAnyDiscoverResults(tab.readingState)) {
    return null;
  }

  return (
    <div
      className={`sb-discover-content-panel sb-discover-content-panel--${variant}`}
      aria-label={t("discover-content-panel", {
        defaultValue: "Discover content",
      })}
    >
      <div className="sb-discover-content-panel-scroll">
        <CrossReferencesSection tab={tab} />
        <StudyNotesSection tab={tab} />
        <ContentSection tab={tab} />
      </div>
    </div>
  );
}
