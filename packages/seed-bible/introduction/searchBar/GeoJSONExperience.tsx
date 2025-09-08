const css = thisBot.tags["GeoJSONExperience.css"];
const css2 = thisBot.tags["App.css"];
const { useState, useEffect, useMemo, useCallback, useRef } = os.appHooks;

const App = ({ from }) => {
    const [search, setSearch] = useState(that?.query ? that.query : "");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [allPlaces, setAllPlaces] = useState([...Object.values(tags["places-new"])]);
    const forwardBtnRef = useRef(null);

    globalThis.locationSearch = search;
    globalThis.setLocationSearch = setSearch;
    globalThis.locationPage = page;
    globalThis.setLocationPage = setPage;

    useEffect(() => {
        setTotalPages(Math.floor((allPlaces.length / 50)));
    }, []);

    const filterItems = useMemo(() => {
        console.log("changed places")
        if (search === "") {
            return [...allPlaces];
        } else {
            setPage(0);
            return allPlaces.filter(place => {
                return place.place.toLowerCase().includes(search.toLowerCase());
            })
        }
    }, [search, allPlaces]);

    useEffect(() => {
        // if(!configBot.tags.miniMapPortal){
        //     setCurrentExperience(0);
        //     setOpenSidebar(false);
        //     whisper(getBot('system', 'main.importer'), 'createCloseButton')
        // }
    }, [])

    useEffect(() => {
        if (page < totalPages) {
            if (!masks.initMap) {
                forwardBtnRef.current.style = { background: "#B0BEC5" }
                setTimeout(() => {
                    forwardBtnRef.current.style = { background: "none" }
                }, 100)
            } else {
                forwardBtnRef.current.style = { background: "none" }
            }
        } else {
            forwardBtnRef.current.style = { background: "#CFD8DC" }
        }
    }, [page, totalPages]);

    const handleNav = useCallback(async () => {
        if (from === "repository") {
            if (globalThis.eventToolApp) {
                RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
                globalThis.EVENT_PANEL_ID = null;
                globalThis.eventToolApp = false;
            }
            let App = await getBot('system', "ext_canvas.eventTool").initInterface()
            if (App) {
                let id = uuid();
                globalThis.eventToolApp = true;
                globalThis.EVENT_PANEL_ID = id;
                AddApplication({ id, App: <App initPage={2} id={id} />, minWidth: "23rem" });
            }

            return
        }
        if (globalThis.eventToolApp) {
            RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
            globalThis.EVENT_PANEL_ID = null;
            globalThis.eventToolApp = false;
        }
        if (globalThis.mapToolApp) {
            RemoveApplicationByID(globalThis.MAP_PANEL_ID);
            globalThis.MAP_PANEL_ID = null;
            globalThis.mapToolApp = false;
            return;
        }
    }, [])

    return <>
        <style>{css2}</style>
        <div class="experience-container" style={{ position: "relative" }}>
            <style>{css}</style>
            {!from && <div class="experience_title_container">
                <div class="experience_title_intro">
                    <span class="material-symbols-outlined experience_title_icon">
                        map
                    </span>
                    <span class="experience_title">Bible Locations</span>
                </div>
                <button onClick={() => handleNav()} class="experience_title_back">
                    <span class="material-symbols-outlined">
                        arrow_back
                    </span>
                </button>
            </div>}
            <div class="geo-container">
                <div class="geo-container-items">
                    {
                        filterItems.slice(page * 50, page * 50 + 49).map(item => {
                            return <Buttons place={item} />
                        })
                    }
                </div>
            </div>
            <div class="nav-container" style={{ bottom: "30px" }}>
                {
                    <span style={{ background: page > 0 ? "none" : "#CFD8DC" }} class="material-symbols-outlined nav-btn" onClick={() => {
                        if (page > 0) {
                            setPage(page - 1);
                        }
                    }}>
                        undo
                    </span>
                }
                <input
                    class="search location"
                    placeholder="search"
                    value={search}
                    onInput={e => setSearch(e.target.value)}
                />
                {
                    <span ref={forwardBtnRef} class="material-symbols-outlined nav-btn" onClick={() => {
                        if (page < totalPages) {
                            setPage(page + 1)
                        }
                    }}>
                        redo
                    </span>
                }
            </div>
        </div>
    </>
}

const Buttons = ({ place }) => {
    const handleClick = useCallback(() => {
        console.log("hello")
        whisper(thisBot, "handleGeoJsonSearch", { place: place });
        setOpenSidebar(false);
        // setCurrentExperience(0);
        // updateCustomHeight(0);
        shout("closeShareButton");
    }, [place]);
    return (
        <>
            <div onClick={() => { handleClick() }} class={`place ${!masks.initMap && locationSearch === "jeru" && place.place === "Jerusalem" ? "blink" : ""}`}>
                <span>{place.place}</span>
            </div>
        </>
    )
}

return App;