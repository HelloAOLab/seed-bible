export const SectionToggle = ({ toggleShowSection, showingContent, section, style }) => {
    return (
        <div 
            className="toggle"
            onClick={() => {
                toggleShowSection(section)
            }}
            style={style}
        >
            <span>{section.name}</span>
            <span className="material-symbols-outlined">{showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down"}</span>
        </div>
    )
}