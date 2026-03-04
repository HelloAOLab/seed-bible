const css = thisBot.tags["GeoJSONExperience.css"];
const {useState, useEffect, useMemo, useCallback, useRef} = os.appHooks;

const App = ({ page = 0, setPage }) => {

    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [eventQuery, setEventQuery] = useState("");
    const [eventData, setEventData] = useState(null);
    const [error, setError] = useState(false);
    const [pageApis, setPageApis] = useState(null);
    const [currentCursor, setCurrentCursor] = useState(null);

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
                    count: 20
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
            default: {
                setPageApis({ ...globalThis.eventApis.peoples });
            }
        }
    }, [page]);

    useEffect(() => {
        globalThis.currentCursor = currentCursor;
        globalThis.setCurrentCursor = setCurrentCursor;
        globalThis.eventQuery = eventQuery;
        globalThis.setEventQuery = setEventQuery;
        return () => {
            globalThis.currentCursor = null;
            globalThis.setCurrentCursor = null;
            globalThis.eventQuery = null;
            globalThis.setEventQuery = null;
        }
    }, [currentCursor,  eventQuery])

    useEffect(() => {
        console.log("Loaded")
    }, [])
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
                    !loading && !error && eventData && eventData.data.places.map(item => <button onClick={() => {
                        // createEvent({ uid: item.uid, textBotId: botId, page: page })
                    }} style={{ background: "#CFD8DC" }} class="event-result">{item.title}</button>)
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
                        if (currentPage < 26) {
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

return App;