let dim = os.getCurrentDimension();
os.unregisterApp('closeButton')
await os.registerApp('closeButton', thisBot);
const style = tags["Close.css"]

const { useEffect, useState, useRef, useCallback } = os.appHooks;

function App() {
    const close = useCallback(() => {
        if (configBot.tags.gridPortal) {
            configBot.tags.gridPortal = null;
            configBot.tags.mapPortal = "map_portal";
            configBot.tags.miniMapPortal = "map_portal";
        } else if (configBot.tags.mapPortal || configBot.tags.miniMapPortal) {
            configBot.tags.gridPortal = "thePortal";
            configBot.tags.mapPortal = null;
            configBot.tags.miniMapPortal = null;
        }
    }, [])

    return (
        <>
            <style>{style}</style>
            <button onClick={close} class={`custom-button-1 canvas-bound chaism-close-btn ${masks.blinkClose ? "close-blink" : ""}`} style={{ zIndex: 10005 }}>
                {that?.closeBtnTitle ? that.closeBtnTitle : "Swap"}
            </button>
            <style>{tags["Close.css"]}</style>
        </>
    );
}

os.compileApp('closeButton', <App />)