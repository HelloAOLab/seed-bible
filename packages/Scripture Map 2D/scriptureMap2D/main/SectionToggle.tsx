import type { SectionToggleType } from "scriptureMap2D.main.types";

const { memo } = os.appCompat;

export const SectionToggle = memo<SectionToggleType>(
  ({ toggleShowSection, showingContent, section, style, sectionKey }) => {
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
