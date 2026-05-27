import type { SectionInfo } from "bibleVizUtils.domain.models.arrangement";
import { useSectionToggle } from "scriptureMap.hooks.useSectionToggle";

const { memo } = os.appCompat;

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
        className={`toggle toggle-section${showingContent ? " toggle-section-enabled" : ""}`}
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
