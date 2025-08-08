os.unregisterApp("sidebar-tool");
os.registerApp("sidebar-tool");

const { useState, useRef, useEffect } = os.appHooks;

const DragDrop = thisBot.DragDrop();

const sendIcon = (vars) => {
    if (vars === null) {
        // thisBot.cursorFollow({ type: null })
        os.unregisterApp('mouseCursor')
        masks['clicked'] = false
        masks['type'] = null
        return
    }
    if (vars.action) {
        vars.action();
        return
    }
    thisBot.cursorFollow({ type: vars.type })
    masks['clicked'] = true
    masks['type'] = vars
}

globalThis.sendIcon = sendIcon;

const initialTools = [
    {
        Element: <div className="tool-item canvas-assistant-icon tooltip" onClick={() => sendIcon({
            type: 'animation', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                let aiAssistant = getBot('system', 'experience.aiAssistant');
                if (aiAssistant.masks?.initiated) {
                    await os.unregisterApp('aiAssistant');
                } else {
                    whisper(aiAssistant, "init");
                }
            }
        })} >
            <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png" alt="AO" />
            <span class="tooltiptext tooltip-right">AI Assistant</span>
        </div>,
        id: 8,
        render: true
    },
    {
        Element: <div className="tool-item tooltip" onClick={() => {
            sendIcon({ type: 'annotation', trayColor: "#ffffff", dragerColor: "#000000", action: null });
            shout("startAnnotation")
            if (!globalThis?.annotInitialized) {
                whisper(getBot('system', 'experience.annotation'), "initialize", { botIds: [] });
            }
        }} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                publish
            </span>
            <span class="tooltiptext tooltip-right">Annotation</span>
        </div>,
        id: 1,
        render: true
    },
    {
        Element: <div className="tool-item tooltip" onClick={() => sendIcon({ type: 'text_tool', trayColor: "#ffffff", dragerColor: "#000000", action: null })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                title
            </span>
            <span class="tooltiptext tooltip-right">Text Tool</span>
        </div>,
        id: 2,
        render: true
    },
    {
        Element: <div className="tool-item tooltip" onClick={() => sendIcon({ type: 'mind_map', trayColor: "#ffffff", dragerColor: "#000000", action: null })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                mindfulness
            </span>
            <span class="tooltiptext tooltip-right">Mindmap</span>
        </div>,
        id: 7,
        render: true
    },
    {
        Element: <div className="tool-item canvas-sideBar-icon tooltip" onClick={() => sendIcon({ type: 'bible-stack', trayColor: "#ffffff", dragerColor: "#000000", action: null })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                auto_stories
            </span>
            <span class="tooltiptext tooltip-right">Protestant Bible</span>
            <span class="material-symbols-outlined subIcon">autorenew</span>
        </div>,
        id: 9,
        render: true
    },
    {
        Element: <div className="tool-item tooltip" onClick={() => sendIcon({ type: 'eraser', trayColor: "#ffffff", dragerColor: "#000000", action: null })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                ink_eraser_off
            </span>
            <span class="tooltiptext tooltip-right">Eraser</span>
        </div>,
        id: 3,
        render: true
    },
    {
        Element: <div className={`tool-item canvas-animation-icon tooltip`} onClick={() => sendIcon({
            type: 'animation', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                let animationTool = getBot('system', 'experience.animateTool');
                if (animationTool.masks?.initiated) {
                    await os.unregisterApp('animationDialog');
                    setTagMask(animationTool, "initiated", false, "tempLocal");
                    let axisArrow = getBot("axisArrow");
                    let circle = getBot("circle");
                    setTagMask(axisArrow, "formOpacity", 0);
                    setTagMask(circle, "formOpacity", 0);
                    setTagMask(circle, "strokeColor", "transparent");
                } else {
                    whisper(animationTool, "initAnimateDialog");
                }
            }
        })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                animation
            </span>
            <span class="tooltiptext tooltip-right">Animation Tool</span>
        </div>,
        id: 4,
        render: true
    },
    {
        Element: <div className="tool-item canvas-sideBar-icon tooltip" onClick={() => sendIcon({
            type: 'sideBar', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                if (globalThis?.setOpenSidebar) {
                    if (openSidebar && currentExperience === 0) {
                        setOpenSidebar(false);
                        await os.sleep(500);
                        setCurrentExperience(10)
                        setOpenSidebar(true);
                        return
                    }
                    setCurrentExperience(10)
                    setOpenSidebar(!openSidebar)
                } else {
                    whisper(getBot('system', 'ext_canvas.sideBar'), 'onInstJoined')
                    await os.sleep(250);
                    setCurrentExperience(10)
                    setOpenSidebar(!openSidebar)
                }
            }
        })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                database
            </span>
            <span class="tooltiptext tooltip-right">Data Ocean</span>
        </div>,
        id: 5,
        render: true
    },
    {
        Element: <div className="tool-item canvas-sideBar-icon tooltip" onClick={() => sendIcon({
            type: 'sideBar', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                let authBot = await os.requestAuthBotInBackground();
                if (authBot) {
                    let lobbyBot = getBot('system', 'experience.lobby');
                    if (lobbyBot.tags.lobbyInitiated) {
                        setSelectedDim(null);
                        await os.sleep(100);
                    }
                    os.goToDimension("seed");
                } else {
                    os.toast("User must be logged in!")
                }
            }
        })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                nature
            </span>
            <span class="tooltiptext tooltip-right">The Seed</span>
        </div>,
        id: 11,
        render: true
    },
    {
        Element: <div className="tool-item canvas-sideBar-icon tooltip" onClick={() => sendIcon({
            type: 'sideBar', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                // assistantActions.navigateToLobby({parameters: {}});
                os.goToDimension("lobby_1");
                await os.sleep(200);
                whisper(getBot('system', 'experience.lobby'), "onInstJoined");
            }
        })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                interpreter_mode
            </span>
            <span class="tooltiptext tooltip-right">Lobby</span>
        </div>,
        id: 10,
        render: true
    },
    {
        Element: <div className="tool-item canvas-sideBar-icon tooltip" onClick={() => sendIcon({
            type: 'sideBar', trayColor: "#ffffff", dragerColor: "#000000", action: async () => {
                setOpenSettingsBar(!openSettingsBar)
            }
        })} >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--on-priimary)" }}>
                settings
            </span>
            <span class="tooltiptext tooltip-right">Settings</span>
        </div>,
        id: 6,
        render: true
    }
]

const Sidebar = () => {
    const scrollRef = useRef(null);
    const [list, setList] = useState(initialTools);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 187;
        }
    }, [scrollRef]);

    useEffect(() => {
        globalThis.canvasList = list;
        globalThis.setCanvasList = setList;
        globalThis.sendIcon = sendIcon;
        return () => {
            globalThis.canvasList = null;
            globalThis.setCanvasList = null;
            globalThis.sendIcon = null;
        }
    }, [list])

    return (
        <>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
            <style>{thisBot.tags['canvas.css']}</style>
            <div className={`sidebar-tool`} style={{display: "none"}}>
                <div ref={scrollRef} style={{
                    maxHeight: "80vh",
                    overflow: "visible",
                    padding: "0 8px",
                    zIndex: "10",
                    display: 'flex',
                    flexDirection: "column",
                    gap: "8px"
                }}>
                    {list && <DragDrop list={list} setList={setList} />}
                </div>
            </div>
        </>
    );
}

os.compileApp("sidebar-tool", <Sidebar />);