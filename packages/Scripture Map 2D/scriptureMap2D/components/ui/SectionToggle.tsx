import type { SectionInfo } from "bibleVizUtils.data.BibleVizDataRepository";

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
    return (
      <div
        className={`toggle toggle-section${showingContent ? " toggle-section-enabled" : ""}`}
        onClick={() => {
          toggleShowSection(sectionKey);
        }}
        style={style}
      >
        <span className="toggle-title">{section.name}</span>
        <span className="material-symbols-outlined toggle-arrow">
          {showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </div>
    );
  }
);
