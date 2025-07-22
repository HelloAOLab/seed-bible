await os.unregisterApp("test1")
await os.registerApp("test1")

const style = tags["test.css"]

const { useState, useEffect, useMemo } = os.appHooks;

const jsonToCss = (json) => {
    return Object.entries(json)
        .map(([key, value]) => {
            // Convert camelCase to kebab-case
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebabKey}: ${value};`;
        })
        .join(' ');
}

const App = () => {

    const [gameContainer, setGameContainer] = useState({
        position: "fixed !important",
        right: "0px !important",
        top: "0px !important"
    });
    const [mapCanvas, setMapCanvas] = useState({

    });
    const [mapViewPoint, setMapViewPoint] = useState({
        bottom: "0px !important",
        left: "0px !important",
        width: "0px !important",
        height: "0px !important",
    });
    const [gameBackground, setGameBackground] = useState({

    });
    const [gameCanvas, setGameCanvas] = useState({

    });
    const [gameCanvasDiv, setGameCanvasDiv] = useState({

    });
    const [gameCanvasDivDiv, setGameCanvasDivDiv] = useState({

    });
    const [gameCanvasDivCanvas, setGameCanvasDivCanvas] = useState({

    });

    const [hw, setHw] = useState({
        height: "0px !important",
        width: "0px !important",
    })
    const [tl, setTl] = useState({
        top: "0px !important",
        left: "0px !important",
    })

    const combinedStyle = useMemo(() => {
        let gameContainerCss = jsonToCss(gameContainer);
        let hwCss = jsonToCss(hw);
        let tlCss = jsonToCss(tl);
        let mapViewPointCss = jsonToCss(mapViewPoint);
        let style = `
            .game-container {
                ${gameContainerCss}
                ${hwCss}
                ${tlCss}
                z-index: 5;
                display: block !important;
            }
            #app-game-container, .main-content {
                ${gameContainerCss}
                ${hwCss}
                ${tlCss}
                z-index: 5;
                overflow: hidden;
                display: block !important;
            }
        `;
        return style;
    }, [gameContainer, mapCanvas, mapViewPoint, gameBackground, gameCanvas, hw, tl])

    globalThis.setHW = setHw;
    globalThis.setTL = setTl;
    globalThis.setMapViewPoint = setMapViewPoint;

    return <>
        <style>{combinedStyle}</style>
    </>
}

os.compileApp("test1", <App />)