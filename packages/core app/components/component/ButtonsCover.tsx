const ButtonsCover = ({ children, secondary, style = {} }) => {
    return <>
        <style>{thisBot.tags["button-cover.css"]}</style>
        <div style={style} className={`button-cover ${secondary ? 'secondary' : ''}`}>
            {children}
        </div >
    </>;
}

return ButtonsCover;