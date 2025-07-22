const Button = ({ children, onClick, isDisabled, secondaryAlt, small, secondary = false, color = "", backgroundColor = "", style = {}, varient = "" }) => {
    return <>
        <style>{thisBot.tags["button.css"]}</style>
        <button
            disabled={isDisabled}
            onClick={(e) => {
                shout("playSound", { soundName: "DialogClick" });
                onClick(e);
            }}
            className={`custom-button ${small ? 'small' : ''} ${secondaryAlt ? "secondaryAlt secondaryAltAlt" : ""}  ${secondary ? 'secondaryAlt' : ""} ${varient}`}
            style={{
                color,
                backgroundColor,
                ...style
            }}
        >
            {children}
        </button>
    </>
}

return Button;