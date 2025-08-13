const NavigationButton = ({ buttonInfo }) => {
    const { content, iconName, action, backgroundColor, enabled } = buttonInfo;
    
    return (
        <button style={{ backgroundColor: enabled ? backgroundColor : "grey", opacity: enabled ? 1 : 0.5 }} className="navigationButton" onClick={() => {if(enabled) action() }}>
            <span className="material-symbols-outlined">{iconName}</span>
            <span>{content}</span>
        </button>
    )
}

return NavigationButton;