const LoaderSecondary = thisBot.LoaderSecondary();

const Button = ({ children, loading, onClick, isDisabled, secondaryAlt, small, secondary = false, color = "", backgroundColor = "", style = {}, varient = "" }) => {
    return <>
        <style>{thisBot.tags["button.css"]}</style>
        <button
            disabled={isDisabled}
            onClick={(e) => {
                if (!loading && isDisabled) return;
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
            {loading ? <LoaderSecondary secondary={secondary} /> : null}
        </button>
    </>
}

return Button;