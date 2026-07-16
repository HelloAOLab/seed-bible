import type { SectionInfo } from "../../../seed-bible-utils/domain/models/arrangement";
import { useSectionToggle } from "../../hooks/useSectionToggle";

import { memo } from "preact/compat";

export interface SectionToggleProps {
  toggleShowSection: (sectionKey: string) => void;
  showingContent: boolean | undefined;
  section: SectionInfo;
  style: React.CSSProperties;
  sectionKey: string;
}

export const SectionToggle = memo(
  ({
    toggleShowSection,
    showingContent,
    section,
    style,
    sectionKey,
  }: SectionToggleProps) => {
    const { toggleTitleContent, toggleArrowContent } = useSectionToggle({
      section,
      showingContent,
    });

    return (
      <div
        className={`scripture-map-toggle toggle-section${showingContent ? " toggle-section-enabled" : ""}`}
        onClick={() => {
          toggleShowSection(sectionKey);
        }}
        style={style}
      >
        <span className="toggle-title">{toggleTitleContent}</span>
        <span className="material-symbols-outlined toggle-arrow">
          {toggleArrowContent}
        </span>
      </div>
    );
  }
);
