if (configBot.tags.systemPortal) return
await os.unregisterApp("iframeVisible");
await os.registerApp("iframeVisible");

const { useEffect, useState, useRef } = os.appHooks;

const App = () => {

    const [pointerEvent, setpointerEvent] = useState("all");
    const clickButtonRef = useRef(null);

    useEffect(() => {
        const bodyEle = document.body;
        bodyEle.style.margin = "0px";
        bodyEle.style.overflow = "hidden";
    }, [])

    const checkCanvasBound = () => {
        const eventBound = gridPortalBot.tags.pixelWidth - 450;
        if (gridPortalBot.tags.pointerPixel && (gridPortalBot.tags.pointerPixel.x < 310 || gridPortalBot.tags.pointerPixel.y > 940)) {
            setpointerEvent("all");
            return
        }
        if (gridPortalBot.tags.pointerPixel && (globalThis?.EVENT_PANEL_ID || globalThis?.MAP_PANEL_ID || globalThis?.calendarToolApp)&& gridPortalBot.tags.pointerPixel.x > eventBound) {
            setpointerEvent("all");
            return
        }
        setTimeout(() => {
            checkCanvasBound();
        }, 200)
    }

    const checkWindowBound = (e) => {
        if (pointerEvent === "all" && globalThis?.CanvasMode && e.clientX > 310 && e.clientY < 940) {
            setpointerEvent("none");
            setTimeout(() => {
                checkCanvasBound()
            }, 100)
            console.log("index set to 1")
        }
    }

    useEffect(() => {
        window.addEventListener("mousemove", (e) => {
            checkWindowBound(e);
        })
    }, [])

    useEffect(() => {
        setTimeout(() => {
            globalThis.ClickButtonRef = clickButtonRef;
        }, 1000)
        return () => {
            globalThis.ClickButtonRef = null;
        }
    }, [pointerEvent])

    return <>
        <style>{`
            .vm-iframe-container {
                display: block;
                width: 100dvw;
                height: 100dvh;
                overflow: hidden;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 3;
                margin: 0;
                padding: 0;
                background: transparent;
                pointer-events: ${pointerEvent}
            }
            html, body {
                margin: 0;
                padding: 0;
                height: 100dvh;
                width: 100dvw;
                overflow: hidden; /* Optional: prevents scrollbars */
            }
            .vm-iframe-container.game-view-visible iframe:first-child {
                pointer-events: all;
            }
            *, *::before, *::after {
                box-sizing: border-box;
            }
        `}</style>
        <button style={{height: "0px", width: "0px"}} ref={clickButtonRef}></button>
    </>
}

os.compileApp("iframeVisible", <App />)

gridPortalBot.tags.portalBackgroundAddress = "https://publicos-link-filesbucket-404655125928.s3.amazonaws.com/ab-1/00471bdfd73c319edf496024c5349e51a6cf48589d29db12f17c5c71c7c9acbf"
