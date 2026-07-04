const { useState, useEffect, useMemo, useCallback } = os.appHooks;
const css = thisBot.tags["App.css"];
const css2 = getBot("system", "ext_canvas.sideBar").tags["App.css"];

const Aquifer = await thisBot.AquiferInterface();

const GeoJsonExperience = await getBot(
  "system",
  "introduction.searchBar"
).GeoJSONExperience();

const Theographic = ({ dataType = "people" }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventQuery, setEventQuery] = useState("");
  const [eventData, setEventData] = useState(null);
  const [error, setError] = useState(false);
  const [pageApis, setPageApis] = useState({ ...globalThis.eventApis.peoples });
  const [currentCursor, setCurrentCursor] = useState(null);

  const createTimeLine = async ({ personData }) => {
    setLoading(true);
    console.log(personData, "personData");
    whisper(thisBot, "CreateTimeLine", { personData });
    setLoading(false);
  };

  useEffect(() => {
    if (pageApis) {
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
              setEventData(e.data);
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
          count: 30,
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
              console.log(e.data);
              setEventData(e.data);
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
  }, [currentPage, eventQuery, pageApis]);

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
    };
  }, [currentCursor, eventQuery]);

  return (
    <>
      <style>{css2}</style>
      <div class="available-events-item">
        {currentCursor && <style>{currentCursor}</style>}
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
            eventData &&
            eventData.data.map((item) => (
              <button
                onClick={() => {
                  createTimeLine({
                    personData: {
                      ...item,
                      dataType: "theograph",
                    },
                  });
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
              onClick={() => {
                if (currentPage < 9) {
                  setCurrentPage(currentPage + 1);
                }
              }}
            >
              redo
            </button>
          }
        </div>
      </div>
    </>
  );
};

const Repos = [
  {
    Name: "People",
    Sources: ["Theograph", "Aquifer"],
  },
  {
    Name: "Places",
    Sources: ["Aquifer"],
  },
  {
    Name: "Deities",
    Sources: ["Aquifer"],
  },
  {
    Name: "Fauna",
    Sources: ["Aquifer"],
  },
  {
    Name: "Flora",
    Sources: ["Aquifer"],
  },
  {
    Name: "Groups",
    Sources: ["Aquifer"],
  },
  {
    Name: "Realia",
    Sources: ["Aquifer"],
  },
];

const Repository = ({ SelectedRepo = 0, repoType }) => {
  const [currentRepo, setCurrentRepo] = useState(Repos[SelectedRepo]);

  const [source, setSource] = useState(null);

  const handleNav = useCallback(async () => {
    if (source) {
      setSource(null);
      return;
    } else {
      if (globalThis.eventToolApp) {
        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
        globalThis.EVENT_PANEL_ID = null;
        globalThis.eventToolApp = false;
      }
      let App = await getBot("system", "ext_canvas.eventTool").initInterface();
      console.log("people app init");
      if (App) {
        // if (!panelMode) {
        let id = uuid();
        globalThis.eventToolApp = true;
        globalThis.EVENT_PANEL_ID = id;
        AddApplication({
          id,
          App: <App initPage={1} id={id} />,
          minWidth: "23rem",
        });
        // }
      }
    }
  }, [source]);

  useEffect(() => {
    if (repoType === "aquifer") {
      setSource("Aquifer");
    } else if (repoType === "theograph") {
      setSource("Theograph");
    }
  }, [repoType]);

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
            <span class="experience_title">
              {source} {currentRepo.Name} Repository
            </span>
          </div>
          <button onClick={() => handleNav()} class="experience_title_back">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div class="experience-body" style={{ height: "100%" }}>
          {!source && (
            <div class="available-events-item">
              <div class="event-results">
                {currentRepo.Sources.map((item) => {
                  return (
                    <button
                      onClick={() => {
                        setSource(item);
                      }}
                      style={{ background: "#CFD8DC" }}
                      class="event-result"
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {source === "Theograph" && <Theographic />}

          {source === "Aquifer" && <Aquifer defaultTopic={currentRepo.Name} />}

          {source === "Theograph Location" && (
            <GeoJsonExperience from={"repository"} />
          )}
        </div>
      </div>
    </>
  );
};

return Repository;
