const Highlighter = ({ onClose , clipPath, children, positionX = "0", positionY = '0', clipPathMessage = "polygon(0% 0%, 100% 0%, 100% calc(100% - 20px), calc(65% + 20px) calc(100% - 20px), 75% 100%, 64% calc(100% - 20px), 0% calc(100% - 20px))" })=>{
    return <>        
        <style>{thisBot.tags["index.css"]}</style>
        <div
            style={{
                zIndex: '99999',
                backgroundColor: "transparent"
            }}
            onClick={onClose} 
            className="backdrop" 
        />
        <div
            style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                clipPath: clipPath || "circle(30px at calc(100% - 25px) calc(100% - 25px))",
            }}
            onClick={onClose} 
            className="backdrop" 
        />
        <div 
            onClick={onClose}
            style={{
                clipPath: clipPathMessage,
                zIndex: 3,
                position: 'fixed',
                right: positionX,
                bottom: positionY,
                padding: '4px 8px',
                borderRadius: "4px",
                backgroundColor: "white",
            }}
        >
            <div 
                style={{
                    marginBottom: "20px",
                    padding: "12px"
                }}
            >
                {children}
            </div>
        </div>
    </>
}

return Highlighter;