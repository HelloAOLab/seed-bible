const FloatingBanner = ({ children, doNotFloat = false, bgColor = "white", color = "black", zIndex = 99000 }) => {
    return <>
        <style>{thisBot.tags["floating-banner.css"]}</style>
        <div className={`floating-banner ${doNotFloat ? "not-float" : ""}`} style={{ backgroundColor: bgColor, color, zIndex }} >
            {children}
        </div>
    </>
}

return FloatingBanner;