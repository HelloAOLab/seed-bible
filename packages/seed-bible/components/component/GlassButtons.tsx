const GlassButton = ({ children, onClick , isDisabled , style = {}})=>{
    return <>
        <style>{thisBot.tags["glass-button.css"]}</style>
        <button 
            disabled={isDisabled}
            className="glass-button"
            onClick={(e)=>{
                shout("playSound",{soundName: "DialogClick"});
                onClick(e);
            }}
            style={{
                ...style
            }}

        >
            {children}
        </button>
    </>
}

return GlassButton;