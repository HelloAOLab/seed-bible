const { memo } = os.appCompat;

export const SectionToggle = memo(
  ({ toggleShowSection, showingContent, section, style, sectionKey }) => {
    return (
      <div
        className="toggle"
        onClick={() => {
          toggleShowSection(sectionKey);
        }}
        style={style}
      >
        <span>{section.name}</span>
        <span className="material-symbols-outlined">
          {showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </div>
    );
  }
);
