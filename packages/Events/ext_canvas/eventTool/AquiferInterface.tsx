const { useState, useEffect, useMemo, useCallback, useRef } = os.appHooks;
const Aquifer = ({ defaultTopic = "Dieties" }) => {
  return (
    <div class="available-events-item">
      <AquiferObjects currentTopic={defaultTopic} />
    </div>
  );
};

const AquiferObjects = ({ currentTopic }) => {
  const [aquiferObjects, setAquiferObjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventQuery, setEventQuery] = useState("");
  const [pageApis, setPageApis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  useEffect(() => {
    if (pageApis) {
      console.log(pageApis);
      const controller = new AbortController();
      setLoading(true);
      setError(false);
      if (eventQuery !== "") {
        let params = {
          query: eventQuery,
        };
        let queryUrl = pageApis.searchItem;
        queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
        web
          .hook({
            method: "GET",
            url: queryUrl,
          })
          .then((e) => {
            if (!controller.signal.aborted) {
              setLoading(false);
              setAquiferObjects(e.data);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setLoading(false);
              setError(true);
            }
          });
      } else {
        let params = {
          page: currentPage,
          count: 32,
        };
        let queryUrl = pageApis.getItems;
        queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
        web
          .hook({
            method: "GET",
            url: queryUrl,
          })
          .then((e) => {
            if (!controller.signal.aborted) {
              setLoading(false);
              setAquiferObjects(e.data);
            }
          })
          .catch(() => {
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
  }, [currentPage, eventQuery, pageApis, currentTopic]);

  useEffect(() => {
    switch (currentTopic) {
      case "Deities": {
        setSelectedRepo({ repo: 2, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.deities });
        break;
      }
      case "Fauna": {
        setSelectedRepo({ repo: 4, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.fauna });
        break;
      }
      case "flora": {
        setSelectedRepo({ repo: 3, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.flora });
        break;
      }
      case "Groups": {
        setSelectedRepo({ repo: 5, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.groups });
        break;
      }
      case "People": {
        setSelectedRepo({ repo: 0, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.people });
        break;
      }
      case "Places": {
        setSelectedRepo({ repo: 1, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.places });
        break;
      }
      case "Realia": {
        setSelectedRepo({ repo: 6, type: "aquifer" });
        setPageApis({ ...globalThis.aquiferApis.realia });
        break;
      }
    }
  }, [currentTopic]);

  const createEvent = ({ uid }) => {
    setLoading(true);
    let params = {
      uid,
    };
    let queryUrl = pageApis.getItemByUid;
    queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
    web
      .hook({
        method: "GET",
        url: queryUrl,
      })
      .then(async (e) => {
        let aquiferData = e.data.data;
        aquiferData.dataType = "aquifer";
        if (globalThis.eventToolApp) {
          RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
          globalThis.EVENT_PANEL_ID = null;
          globalThis.eventToolApp = false;
        }
        let App = await thisBot.CreateAquiferPage();
        if (App) {
          let id = uuid();
          globalThis.eventToolApp = true;
          globalThis.EVENT_PANEL_ID = id;
          AddApplication({
            id,
            App: (
              <App
                aquiferData={aquiferData}
                selectedRepo={selectedRepo}
                id={id}
              />
            ),
            minWidth: "23rem",
          });
        }
      })
      .catch((e) => {
        setLoading(false);
        os.log(e);
        os.toast("Unable to receive data");
      });
  };

  return (
    <>
      {
        <div class="available-events-item">
          <div class="event-results">
            {loading && (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "calc(40vh - 90px)",
                  width: "100%",
                }}
              >
                <img
                  src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png"
                  alt="AO"
                  className="img-loader"
                />
              </div>
            )}
            {!loading &&
              !error &&
              aquiferObjects &&
              aquiferObjects.data.map((item: any) => (
                <button
                  onClick={() => {
                    console.log(item);
                    createEvent({ uid: item.uid });
                  }}
                  style={{ background: "#CFD8DC" }}
                  class="event-result"
                >
                  {item.title}
                </button>
              ))}
            {!loading && error && <span>Unable to get results</span>}
          </div>
          <div class="nav-container">
            {
              <button
                style={{ background: currentPage > 1 ? "none" : "#CFD8DC" }}
                class="material-symbols-outlined nav-btn"
                onClick={() => {
                  if (currentPage > 1) {
                    console.log(currentPage);
                    setCurrentPage(currentPage - 1);
                  }
                }}
              >
                undo
              </button>
            }
            <input
              class="search location"
              placeholder="search"
              value={eventQuery}
              onInput={(e) => setEventQuery(e.target.value)}
            />
            {
              <button
                class="material-symbols-outlined nav-btn"
                disabled={false}
                onClick={() => {
                  if (currentPage < 50) {
                    console.log(currentPage);
                    setCurrentPage(currentPage + 1);
                  }
                }}
              >
                redo
              </button>
            }
          </div>
        </div>
      }
    </>
  );
};

return Aquifer;
