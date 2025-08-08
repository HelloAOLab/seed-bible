// await os.appHooks.render(<></>, document.body);
await os.unregisterApp('chaismTool');
await os.registerApp('chaismTool', thisBot);
const css = thisBot.tags["App.css"];
const { useState, useEffect, useMemo, useCallback } = os.appHooks;
thisBot.defineGlobal()

const Button = ({ children, onClick, isDisabled, color = "white", backgroundColor = "mediumspringgreen", style = {}, varient = "" }) => {
    return <>
        <style>{thisBot.tags["button.css"]}</style>
        <button
            disabled={isDisabled}

            onClick={(e) => {
                shout("playSound", { soundName: "DialogClick" });
                onClick(e);
            }}

            className={`custom-button ${varient}`}

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

const App = () => {

    const [currentMode, setCurrentMode] = useState(null);
    const [currentCursor, setCurrentCursor] = useState("");
    const [makeMountain, setMakeMountain] = useState(null);
    const [position, setPosition] = useState({ x: "20px", y: "calc(100dvh - 150px)" });
    const [disableMakeMountain, setDisableMakeMountain] = useState(false);
    const [trayExist, setTrayExist] = useState(false);
    const [showModal, setShowModal] = useState(false);
    globalThis.currentMode = currentMode;
    globalThis.setDisableMakeMountain = setDisableMakeMountain;
    globalThis.setCurrentCursor = setCurrentCursor;

    const handleClose = async () => {
        destroy(getBots("tray"));
        destroy(getBots("tray2"));
        destroy(getBots("wordBot"));
        await os.focusOn({ x: 0, y: 0 }, {
            duration: 1,
            rotation: { x: 1.01229, y: 0.5 },
            zoomValue: 7
        })
        gridPortalBot.masks.portalZoomableMax = null;
        gridPortalBot.masks.portalZoomableMin = null;
        gridPortalBot.tags.portalPannable = true;
        gridPortalBot.masks.portalPannable = true;
        gridPortalBot.masks.portalZoomable = true;
        gridPortalBot.tags.portalZoomable = true;
        await os.unregisterApp('chaismTool');
    }

    const handlePlay = () => {
        if (showModal) {
            os.toast("Please press start first!!!");
            return
        }
        setTrayExist(true);
        shout("play");
        setCurrentMode(null);
        setCurrentCursor("");
        setMakeMountain(false);
    }

    const handleMakeMountain = async () => {
        if (!disableMakeMountain) {
            setMakeMountain(!makeMountain);
            if (!makeMountain) {
                await thisBot.makeMountain();
            } else {
                await thisBot.clearMountain();
            }
            masks.undoStack = null;
        } else {
            os.toast("let it load first")
        }
    }
    useEffect(() => {
        destroy(getBots("tempWordBot"));
    }, [currentMode]);

    useEffect(async () => {
        setTagMask(getBot('system', 'ext_canvas.tempTray'), "currentChaism", null, "tempLocal");
        await os.unregisterApp("userOptions");
        gridPortalBot.masks.portalZoomableMax = 50;
        gridPortalBot.masks.portalZoomableMin = gridPortalBot.tags.pixelWidth > 768 ? 8 : 2.5;
        gridPortalBot.tags.portalPannable = false;
        gridPortalBot.masks.portalPannable = false;
        gridPortalBot.masks.portalZoomable = true;
        gridPortalBot.tags.portalZoomable = true;
        handlePlay();
    }, [])

    useEffect(() => {
        setTimeout(() => {
            handleMakeMountain()
        }, 2000)
    }, [])

    useEffect(() => {
        // if (IsTray) {
        //     setBackBtnStatck([...backBtnStack, {
        //         action: () => {
        //             handleClose()
        //         },
        //         type: "chaism"
        //     }])
        // } else {
        //     setBackBtnStatck([...backBtnStack, {
        //         action: () => {
        //             handleClose()
        //         },
        //         type: "chaism"
        //     }])
        // }
        os.unregisterApp('mapButton')
        return () => {
            shout("createMapButton");
        }
    }, [])

    return <>
        <style>{css}</style>
        {
            currentCursor !== "" && <style>{currentCursor}</style>
        }
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <button class={`chaism-tool ${makeMountain ? "chaism-tool-selected" : ""} chaism-btn`} onClick={() => {
            if (!showModal) {
                handleMakeMountain()
            } else {
                os.toast("Please press start first!!!")
            }
        }}>
            <span style={{ height: "26px", width: "26px" }} class="material-symbols-outlined">
                landscape
            </span>
            <span class="tooltiptext">Chiasm</span>
        </button>
        <Button onClick={handleClose} varient="white-background" style={{ zIndex: 10005, position: "fixed", top: "20px", right: "20px", width: "80px", height: "40px" }}>
            ➲ Quit
        </Button>
        {
            showModal && <div class="modal-container">
                <div class="welcome-copy">
                    <h3>Introducing Our Bible Chiasm Tool: Unlocking the Depth of Scripture</h3>
                    <p class="font-heavy"><i>
                        Welcome to our Bible Chiasm Tool, a unique resource designed to enhance your study and understanding of biblical texts in a way that goes beyond traditional analysis. Named after the literary device known as a chiasmus, which is a structure where ideas are presented in a mirrored fashion, but our tools represents the chiasms with mountains as there are great significance of mountains in biblical texts.
                    </i></p>
                    <p><i>Click the <span style={{ verticalAlign: "bottom" }} class="material-symbols-outlined">
                        landscape
                    </span> tool to explore more!!!</i></p>
                    <div class="buttons">
                        <p></p>
                        <button onClick={() => setShowModal(false)} class="custom-button" style="color: white; background-color: black;">
                            Start ➤
                        </button>
                    </div>
                </div>
            </div>
        }
    </>
}

os.compileApp('chaismTool', <App />);