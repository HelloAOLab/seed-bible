const css = thisBot.tags["App.css"];
const css2 = getBot('system', "ext_canvas.sideBar").tags["App.css"]
const { useState, useEffect, useMemo, useCallback, useRef } = os.appHooks;
const dim = os.getCurrentDimension();

const AquiferInterface = await thisBot.AquiferInterface();
const GeoJsonExperience = await getBot('system', "introduction.searchBar").GeoJSONExperience()
const App = ({ initPage = 0, selectedRepo }) => {

    const [page, setPage] = useState(initPage);
    const [title, setTitle] = useState("Bible Data Ocean");

    const handleNav = useCallback(() => {
        if (page === 0) {
            console.log("closing event", globalThis.EVENT_PANEL_ID, page)
            if (globalThis.eventToolApp) {
                RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                globalThis.EVENT_PANEL_ID = null;
                globalThis.eventToolApp = false;
                return;
            }
        } else {
            setPage(0);
        }
    }, [page])

    const CurrentElement = useMemo(() => {
        configBot.tags.miniMapPortal = null;
        if (selectedRepo) {
            setTitle("Repository Ocean");
            return Repository
        }
        configBot.tags.miniMapPortal = null;
        switch (page) {
            case 0:
                setTitle("Bible Data Ocean");
                return EventsAvailableFor
            case 1:
                setTitle("Repository Ocean");
                return Repository
            case 2:
                setTitle("Tool Ocean");
                return Tools
            case 3:
                setTitle("Util Ocean");
                return Utils
            default:
                setTitle("Bible Data Ocean");
                return EventsAvailableFor
        }
    }, [page, selectedRepo])

    useEffect(() => {
        globalThis.page = page;
        globalThis.setPage = setPage;
        return () => {
            globalThis.page = null;
            globalThis.setPage = null;
        }
    }, [page])

    return (
        <>
            <style>{`
                .experience-container {
                    display: flex;
                    width: calc(100% - 25px);
                    height: calc(100% - 20px);
                    /* position: absolute; */
                    top: 0;
                    left: 0;
                    padding: 10px;
                    flex-direction: column;
                    background: white;
                    pointer-events: all;
                }
            `}</style>
            <style>{css2}</style>
            <div class="experience-container">
                <style>{css}</style>
                <div class="experience_title_container">
                    <div class="experience_title_intro">
                        <span class="material-symbols-outlined experience_title_icon">
                            database
                        </span>
                        <span class="experience_title">{title}</span>
                    </div>
                    {page > 0 && <button onClick={() => handleNav()} class="experience_title_back">
                        <span class="material-symbols-outlined">
                            arrow_back
                        </span>
                    </button>}
                    {page === 0 && <button onClick={() => handleNav()} class="experience_title_back">
                        <span class="material-symbols-outlined">
                            close
                        </span>
                    </button>}
                </div>
                <div class="experience-body" style={{ height: "100%" }}>
                    <CurrentElement page={page} setPage={setPage} selectedRepo={selectedRepo} />
                </div>
            </div>
        </>
    )
}

const EventsAvailableFor = ({ page, setPage }) => {
    const [activeIndex, setActiveIndex] = useState(null);
    const [currentCursor, setCurrentCursor] = useState(null);

    const events = useMemo(() => {
        return [
            {
                title: "Repositories",
                icon: "library_books",
                onClick: async () => {
                    setPage(1)
                }
            },
            {
                title: "Tools",
                icon: "history_edu",
                onClick: async () => {
                    setPage(2)
                }
            },
            {
                title: "Utils",
                icon: "location_on",
                onClick: async () => {
                    setPage(3)
                }
            }
        ]
    }, []);

    useEffect(() => {
        configBot.tags.miniMapPortal = null;
        return () => {
            globalThis.eventItemActive = false;
            thisBot.masks.onAnyBotClicked = null;
        }
    }, [])

    return <div class="available-events-item">
        {
            currentCursor && <style>{currentCursor}</style>
        }
        {
            events.map((item, index) => {
                return <div style={index === activeIndex ? { background: "#B3E5FC" } : {}} class="events-item" onClick={item.onClick}>
                    <span style={{ color: "var(--on-primary)" }} class="material-symbols-outlined">
                        {
                            item.icon
                        }
                    </span>
                    <span>{item.title}</span>
                </div>
            })
        }
    </div>
}

const Repository = ({ selectedRepo }) => {
    const events = useMemo(() => {
        return [
            {
                title: "People",
                icon: "person",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    console.log("people app init")
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={0} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Locations",
                icon: "map",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={1} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Dieties",
                icon: "star_rate_half",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={2} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Fauna",
                icon: "cruelty_free",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={3} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Flora",
                icon: "forest",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={4} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Groups",
                icon: "group",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={5} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            },
            {
                title: "Realia",
                icon: "inventory_2",
                onClick: async ({ repoType }) => {
                    if (globalThis.eventToolApp) {
                        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                        globalThis.EVENT_PANEL_ID = null;
                        globalThis.eventToolApp = false;
                    }
                    let App = await thisBot.Repository();
                    if (App) {
                        // if (!panelMode) {
                        let id = uuid();
                        globalThis.eventToolApp = true;
                        globalThis.EVENT_PANEL_ID = id;
                        AddApplication({ id, App: <App SelectedRepo={6} repoType={repoType} id={id} />, minWidth: '23rem' })
                        // }
                    }
                }
            }
        ]
    }, []);

    useEffect(() => {
        configBot.tags.miniMapPortal = null;
        if (selectedRepo) {
            console.log(selectedRepo, "click")
            events[selectedRepo.repo].onClick({ repoType: selectedRepo.type })
        }
    }, [selectedRepo, events])
    useEffect(() => {
        configBot.tags.miniMapPortal = null;
    }, [])
    return <div class="available-events-item">
        {
            events.map((item, index) => {
                return <div class="events-item" onClick={item.onClick}>
                    <span style={{ color: "var(--on-primary)" }} class="material-symbols-outlined">
                        {
                            item.icon
                        }
                    </span>
                    <span>{item.title}</span>
                </div>
            })
        }
    </div>
}
const Tools = () => {
    const [repoPage, setRepoPage] = useState(0)
    const events = useMemo(() => {
        return [
            {
                title: "Sim",
                icon: "location_on",
                onClick: async () => {
                    setRepoPage(2)
                }
            },
            {
                title: "Location History",
                icon: "location_on",
                onClick: async () => {
                    setRepoPage(1)
                }
            },
            {
                title: "Chaism",
                icon: "landscape",
                onClick: async () => {
                    // setPage(4)
                    // setOpenSidebar(false);
                    // setCurrentExperience(1);
                    getBot('system', 'ext_canvas.chaismTool').createTool()
                }
            }
        ]
    }, []);
    useEffect(() => {
        configBot.tags.miniMapPortal = null;
    }, [])
    return <>
        <div class="available-events-item">
            {
                repoPage === 0 && events.map((item, index) => {
                    return <div class="events-item" onClick={item.onClick}>
                        <span style={{ color: "var(--on-primary)" }} class="material-symbols-outlined">
                            {
                                item.icon
                            }
                        </span>
                        <span>{item.title}</span>
                    </div>
                })
            }
            {
                repoPage === 1 && <SelectedEventPage page={1} />
            }
            {
                repoPage === 2 && <SelectedEventPage page={2} />
            }
        </div>
    </>
}
const Utils = () => {
    const [repoPage, setRepoPage] = useState(0)
    const events = useMemo(() => {
        return [
            {
                title: "Locations",
                icon: "map",
                onClick: async () => {
                    setRepoPage(1);
                }
            }
        ]
    }, []);
    useEffect(() => {
        configBot.tags.miniMapPortal = null;
    }, [])
    return <>
        {repoPage === 0 && <div class="available-events-item">
            {
                events.map((item, index) => {
                    return <div class="events-item" onClick={item.onClick}>
                        <span style={{ color: "var(--on-primary)" }} class="material-symbols-outlined">
                            {
                                item.icon
                            }
                        </span>
                        <span>{item.title}</span>
                    </div>
                })
            }
        </div>}
        {
            repoPage === 1 && <GeoJsonExperience from={"repository"} />
        }
    </>
}

const SelectedEventPage = ({ page, setPage }) => {

    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [eventQuery, setEventQuery] = useState("");
    const [eventData, setEventData] = useState(null);
    const [error, setError] = useState(false);
    const [pageApis, setPageApis] = useState(null);
    const [currentCursor, setCurrentCursor] = useState(null);
    const [botId, setBotId] = useState(null);

    const createEvent = ({ uid, textBotId = null, page = 0 }) => {
        setLoading(true);
        let params = {
            uid
        };
        let queryUrl = pageApis.getItemByUid;
        queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
        switch (page) {
            case 3: {
                web.hook({
                    method: "GET",
                    url: queryUrl
                }).then((e) => {
                    console.log(e.data.data)
                    if (e.data.status === 200) {
                        os.getFile(e.data.data.recordAddress).then(e => {
                            console.log(e, "result");
                            globalThis.animationBotsData = {
                                ...e
                            };
                            os.toast("Place the cursor anywhere you want to load animation", 3);
                            setTagMask(thisBot, "onGridClick", `@
                                whisper(thisBot, "createAnimationBots", {
                                    ...that
                                });
                            `, "tempLocal")
                            setLoading(false);
                        }).catch((e) => {
                            console.log(e, "error")
                            os.toast("Something went wrong!");
                            setLoading(false);
                        })
                    } else {
                        os.toast("Something went wrong!");
                        setLoading(false);
                    }
                }).catch(e => {
                    console.log(e);
                    os.toast("Something went wrong!");
                    setLoading(false);
                })
                break
            }
            default: {
                web.hook({
                    method: "GET",
                    url: queryUrl
                }).then((e) => {
                    if (textBotId) {
                        const chosenTextBot = getBot(byID(textBotId));
                        const currentDim = os.getCurrentDimension();
                        shout("createEventBot", {
                            eventBotData: e.data.data, position: {
                                x: chosenTextBot.tags[currentDim + "X"],
                                y: chosenTextBot.tags[currentDim + "Y"]
                            }
                        });
                        destroy(chosenTextBot);
                        const typingTool = getBot(byTag("typingTool"));
                        whisper(typingTool, "removeMenuButtons");
                        whisper(typingTool, "removeTLTools");
                        setLoading(false);
                    } else {
                        os.toast("Click on a text bot to load it", 3);
                        setLoading(false);
                        try {
                            sendIcon({ type: 'timeLine', trayColor: "#ffffff", dragerColor: "#000000", action: null });
                        } catch { () => { } }
                        globalThis.eventData = e.data.data;
                    }
                }).catch(() => {
                    setLoading(false);
                    os.toast("Unable to receive data")
                });
            }
        }
    };

    useEffect(() => {
        if (pageApis) {
            const controller = new AbortController();
            setLoading(true);
            setError(false);
            if (eventQuery !== "") {
                let params = {
                    query: eventQuery
                }
                let queryUrl = pageApis.searchItem;
                queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
                web.hook({
                    method: "GET",
                    url: queryUrl
                }).then((e) => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                        setEventData(e.data)
                        if (botId && e.data.data.length === 1) {
                            createEvent({ uid: e.data.data[0].uid, textBotId: botId, page });
                            setBotId(null);
                            setLoading(false);
                        }
                    }
                }).catch(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                        setError(true);
                    }
                });
            } else {
                let params = {
                    page: currentPage,
                    count: 32
                }
                let queryUrl = pageApis.getItems;
                queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
                web.hook({
                    method: "GET",
                    url: queryUrl
                }).then((e) => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                        setEventData(e.data)
                    }
                }).catch(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                        setError(true);
                    }
                });
            }
            return () => {
                controller.abort();
            };
        }
    }, [currentPage, eventQuery, pageApis, page])

    useEffect(() => {
        switch (page) {
            case 1: {
                setPageApis({ ...globalThis.eventApis.places });
                break
            }
            case 2: {
                setPageApis({ ...globalThis.eventApis.simulation });
                break;
            }
            case 3: {
                setPageApis({ ...globalThis.eventApis.animations });
                break
            }
            default: {
                setPageApis({ ...globalThis.eventApis.places });
            }
        }
    }, [page]);

    useEffect(() => {
        globalThis.currentCursor = currentCursor;
        globalThis.setCurrentCursor = setCurrentCursor;
        globalThis.createEvent = createEvent;
        globalThis.eventQuery = eventQuery;
        globalThis.setEventQuery = setEventQuery;
        globalThis.botId = botId;
        globalThis.setBotId = setBotId;
        return () => {
            globalThis.currentCursor = null;
            globalThis.setCurrentCursor = null;
            globalThis.createEvent = null;
            globalThis.eventQuery = null;
            globalThis.setEventQuery = null;
            globalThis.botId = botId;
            globalThis.setBotId = setBotId;
        }
    }, [currentCursor, createEvent, eventQuery, botId])

    return <>
        {<div class="available-events-item">
            {
                currentCursor && <style>{currentCursor}</style>
            }
            <div class="event-results">
                {
                    loading && <div style={{ display: "grid", placeItems: 'center', height: 'calc(40vh - 90px)', width: '100%' }}>
                        <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png" alt="AO" className="img-loader" />
                    </div>
                }
                {
                    !loading && !error && eventData && eventData.data.map(item => <button onClick={() => {
                        createEvent({ uid: item.uid, textBotId: botId, page: page })
                    }} style={{ background: botId ? getBot(byID(botId)).masks.color : "#CFD8DC" }} class="event-result">{item.title}</button>)
                }
                {
                    !loading && error && <span>Unable to get results</span>
                }
            </div>
            <div class="nav-container">
                {
                    <button style={{ background: currentPage > 1 ? "none" : "#CFD8DC" }} class="material-symbols-outlined nav-btn" onClick={() => {
                        if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                        }
                    }}>
                        undo
                    </button>
                }
                <input
                    class="search location"
                    placeholder="search"
                    value={eventQuery}
                    onInput={e => setEventQuery(e.target.value)}
                />
                {
                    <button class="material-symbols-outlined nav-btn" onClick={() => {
                        if (currentPage < 50) {
                            setCurrentPage(currentPage + 1)
                        }
                    }}>
                        redo
                    </button>
                }
            </div>
        </div>}
    </>
}

const Annotations = ({ page, setPage }) => {
    const [currentCursor, setCurrentCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [eventQuery, setEventQuery] = useState("");
    const [eventData, setEventData] = useState(null);
    const [error, setError] = useState(false);


    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        if (eventQuery !== "") {
            let params = {
                query: eventQuery,
                page: 1,
                count: 10
            }
            let queryUrl = "https://theographic-bible-api.netlify.app/api/annotations/getAnnotations";
            queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
            web.hook({
                method: "GET",
                url: queryUrl
            }).then((e) => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setEventData(e.data);
                }
            }).catch(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setError(true);
                }
            });
        } else {
            let params = {
                page: currentPage,
                count: 10
            }
            let queryUrl = "https://theographic-bible-api.netlify.app/api/annotations/getAnnotations";
            queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
            web.hook({
                method: "GET",
                url: queryUrl
            }).then((e) => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    console.log(e.data)
                    setEventData(e.data)
                }
            }).catch((e) => {
                console.log(e)
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setError(true);
                }
            });
        }
        return () => {
            controller.abort();
        };
    }, [eventQuery, currentPage])

    useEffect(() => { console.log(eventData) }, [eventData])

    return <div class="available-events-item">
        {
            currentCursor && <style>{currentCursor}</style>
        }
        <div class="event-results">
            {
                loading && <div style={{ display: "grid", placeItems: 'center', height: 'calc(40vh - 90px)', width: '100%' }}>
                    <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png" alt="AO" className="img-loader" />
                </div>
            }
            {
                !loading && !error && eventData && eventData.data.map(item => <button onClick={() => {
                    if (globalThis?.selectedAnnot) {
                        globalThis.selectedAnnot = null;
                        try {
                            sendIcon(null);
                        } catch { () => { } }
                    } else {
                        globalThis.selectedAnnot = item;
                        try {
                            sendIcon({ type: 'newAnnot', trayColor: "#ffffff", dragerColor: "#000000", action: null });
                        } catch { () => { } }
                    }
                }} class="event-result">{item.title}</button>)
            }
            {
                !loading && error && <span>Unable to get results</span>
            }
        </div>
        <div class="nav-container">
            {
                <button style={{ background: currentPage > 1 ? "none" : "#CFD8DC" }} class="material-symbols-outlined nav-btn" onClick={() => {
                    if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                    }
                }}>
                    undo
                </button>
            }
            <input
                class="search location"
                placeholder="search"
                value={eventQuery}
                onInput={e => setEventQuery(e.target.value)}
            />
            {
                <button class="material-symbols-outlined nav-btn" onClick={() => {
                    if (currentPage < 50) {
                        setCurrentPage(currentPage + 1)
                    }
                }}>
                    redo
                </button>
            }
        </div>
    </div>
}

return App;