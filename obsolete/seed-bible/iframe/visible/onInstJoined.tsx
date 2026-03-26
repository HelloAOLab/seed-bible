if (configBot.tags.systemPortal) return
await os.unregisterApp("iframeVisible");
await os.registerApp("iframeVisible");

const { useEffect, useState, useRef } = os.appHooks;

const detectAreaBound = (x, y, elements) => {
    for (const el of elements) {
        if (
            x >= el[0] &&
            x <= el[1] &&
            y >= el[2] &&
            y <= el[3]
        ) {
            return true;
        }
    }
    return false;
}

const App = () => {

    // const [pointerEvent, setpointerEvent] = useState("all");
    // const clickButtonRef = useRef(null);

    // useEffect(() => {
    //     let bodyEle = document.body;
    //     bodyEle.style.margin = "0px";
    //     bodyEle.style.overflow = "hidden";
    // }, [])

    // const checkCanvasBound = () => {
    //     try {
    //         if (gridPortalBot.tags.pointerPixel && detectAreaBound(gridPortalBot.tags.pointerPixel.x, gridPortalBot.tags.pointerPixel.y, window.permaElements)) {
    //             setpointerEvent("all");
    //             console.log("outside canvas")
    //             return
    //         }
    //         setTimeout(() => {
    //             checkCanvasBound();
    //         }, 100)
    //     } catch {
    //         (e) => {
    //             console.errot(e, "checkCanvasBound")
    //             setTimeout(() => {
    //                 checkCanvasBound();
    //             }, 100)
    //         }
    //     }
    // }

    // const checkWindowBound = (e) => {
    //     try {
    //         if (!detectAreaBound(e.clientX, e.clientY, window.permaElements) && window.permaElements.length > 0) {
    //             setpointerEvent("none");
    //             console.log("outside window")
    //             setTimeout(() => {
    //                 checkCanvasBound()
    //             }, 100)
    //         }
    //     } catch {
    //         e => {
    //             console.error(e, "checkWindowBound")
    //         }
    //     }
    // }

    // const focusOnVisibleButton = () => {
    //     clickButtonRef.current.focus()
    // }

    // const handleMouseCheck = () => {
    //     if ((window?.CanvasMode || globalThis?.CanvasMode)) {
    //         const elementsToCheck = document.getElementsByClassName('boundElements');
    //         let bounds = [];
    //         for (const el of elementsToCheck) {
    //             const rect = el.getBoundingClientRect();
    //             bounds.push([rect.left, rect.right, rect.top, rect.bottom])
    //         }
    //         window.permaElements = [...bounds];
    //         if (bounds.length > 0 && !window?.windowMounted) {
    //             console.log("mounting window");
    //             window.addEventListener("mousemove", checkWindowBound);
    //             window.windowMounted = true;
    //         }
    //     } else if (window?.windowMounted) {
    //         console.log("unmounting window");
    //         window.removeEventListener("mousemove", checkWindowBound);
    //         window.windowMounted = false;
    //     }
    // }

    // useEffect(() => {
    //     setTimeout(() => {
    //         globalThis.focusOnVisibleButton = focusOnVisibleButton;
    //     }, 1000)
    //     return () => {
    //         globalThis.focusOnVisibleButton = null;
    //     }
    // }, [])

    // useEffect(() => {
    //     let it = setInterval(() => {
    //         handleMouseCheck();
    //     }, 250);
    //     return () => {
    //         clearInterval(it)
    //     }
    // }, [])

    return <>
        <style>{`
            .vm-iframe-container iframe:first-child {
                pointer-events: auto !important;
            }
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
                pointer-events: all;
            }
            html, body {
                margin: 0;
                padding: 0;
                height: 100dvh;
                width: 100dvw;
                overflow: hidden; /* Optional: prevents scrollbars */
            }
            *, *::before, *::after {
                box-sizing: border-box;
            }
        `}</style>
    </>
}

os.compileApp("iframeVisible", <App />)

gridPortalBot.tags.portalBackgroundAddress = "https://publicos-link-filesbucket-404655125928.s3.amazonaws.com/ab-1/00471bdfd73c319edf496024c5349e51a6cf48589d29db12f17c5c71c7c9acbf"
