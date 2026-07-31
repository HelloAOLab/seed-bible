let dim = os.getCurrentDimension();
const css = thisBot.tags["App.css"];
const css2 = getBot("system", "ext_canvas.sideBar").tags["App.css"];

const { useEffect, useState, useRef, useCallback, useMemo } = os.appHooks;

const App = ({ aquiferData, prevData = [], selectedRepo }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [theoGraphicData, setTheoGraphicData] = useState(null);
  const [theoGraphicDataApi, setTheoGraphicDataApi] = useState(null);
  const title = useMemo(() => {
    if (aquiferData) {
      return aquiferData.localizations.eng?.preferred_label;
    } else {
      return "";
    }
  }, [aquiferData]);

  const description = useMemo(() => {
    if (aquiferData) {
      return aquiferData.localizations.eng?.descriptions.length > 0
        ? aquiferData.localizations.eng?.descriptions[0]?.description || ""
        : "";
      return "";
    }
  }, [aquiferData]);

  const topicApi = ({ uid }) => {
    if (uid.includes("deities:")) {
      return { ...globalThis.aquiferApis.deities };
    } else if (uid.includes("flora:")) {
      return { ...globalThis.aquiferApis.flora };
    } else if (uid.includes("fauna:")) {
      return { ...globalThis.aquiferApis.fauna };
    } else if (uid.includes("group:")) {
      return { ...globalThis.aquiferApis.groups };
    } else if (uid.includes("person:")) {
      setTheoGraphicDataApi({ ...globalThis.eventApis.peoples });
      console.log("hsdax");
      return { ...globalThis.aquiferApis.people };
    } else if (uid.includes("place:")) {
      setTheoGraphicDataApi({ ...globalThis.eventApis.places });
      return { ...globalThis.aquiferApis.places };
    } else if (uid.includes("realia:")) {
      return { ...globalThis.aquiferApis.realia };
    }
  };

  const LoadData = ({ uid }) => {
    if (!uid || uid === undefined) {
      return;
    }
    setLoading(true);
    let params = {
      uid,
    };
    let pageApis = topicApi({ uid });
    console.log(pageApis);
    let queryUrl = pageApis.getItemByUid;
    queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
    web
      .hook({
        method: "GET",
        url: queryUrl,
      })
      .then(async (e) => {
        // next steps
        // globalThis.eventData = e.data.data;
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
                aquiferData={e.data.data}
                prevData={[...prevData, aquiferData]}
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

  const handleMapNav = ({ data }) => {
    let sideBar = getBot("system", "ext_canvas.sideBar");
    let name = data.localizations.eng.preferred_label.toLowerCase();
    if (sideBar.tags["places-new"][name]) {
      shout("handleGeoJsonSearch", { place: sideBar.tags["places-new"][name] });
      whisper(
        getBot("system", "ext_geoImporter.importer"),
        "createCloseButton"
      );
    } else if (data?.geocoordinates?.obi) {
      let geojson = {
        geometry: {
          coordinates: [
            data.geocoordinates.obi.lat,
            data.geocoordinates.obi.lon,
          ],
          type: "Point",
        },
        properties: {
          id: data.localizations.eng.preferred_label,
        },
        type: "Feature",
      };
      shout("handleGeoJsonSearch", { geojson });
      whisper(
        getBot("system", "ext_geoImporter.importer"),
        "createCloseButton"
      );
    }
  };

  const createTimeLine = async ({ personData, prevData }) => {
    setLoading(true);
    whisper(thisBot, "CreateTimeLine", { personData, prevData });
    setLoading(false);
  };

  const handleNav = async () => {
    if (prevData.length > 0) {
      let tempPrevData = prevData;
      let prevPerson = tempPrevData.pop();
      if (prevPerson.dataType === "aquifer") {
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
              <App aquiferData={prevPerson} prevData={tempPrevData} id={id} />
            ),
            minWidth: "23rem",
          });
        }
      } else {
        createTimeLine({ personData: prevPerson, prevData: tempPrevData });
      }
    } else {
      if (globalThis.eventToolApp) {
        RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
        globalThis.EVENT_PANEL_ID = null;
        globalThis.eventToolApp = false;
      }
      let App = await thisBot.initInterface();
      if (App) {
        let id = uuid();
        globalThis.eventToolApp = true;
        globalThis.EVENT_PANEL_ID = id;
        AddApplication({
          id,
          App: <App initPage={5} selectedRepo={selectedRepo} id={id} />,
          minWidth: "23rem",
        });
      }
    }
  };

  useEffect(async () => {
    if (aquiferData) {
      let theoApi = null;
      if (aquiferData.uid.includes("person:")) {
        theoApi = { ...globalThis.eventApis.peoples };
      } else if (aquiferData.uid.includes("place:")) {
        theoApi = { ...globalThis.eventApis.places };
      }
      if (theoApi) {
        let params = {
          query: title,
        };
        let queryUrl = theoApi.searchItem;
        queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
        let personDataReq = await web.get(queryUrl);
        if (personDataReq.data.data.length === 1) {
          setTheoGraphicData([...personDataReq.data.data]);
        }
      }
    }
  }, [aquiferData, title]);

  useEffect(() => {
    configBot.tags.miniMapPortal = null;
  }, []);

  return (
    <>
      <style>{css}</style>
      <style>{css2}</style>
      <div class="experience-container">
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
        <div class="experience_title_container">
          <div class="experience_title_intro">
            <span class="material-symbols-outlined experience_title_icon">
              person
            </span>
            <span class="experience_title">{title} Aquifer Info</span>
          </div>
          <button onClick={handleNav} class="experience_title_back">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div class="experience-body" style={{ height: "100%" }}>
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
          {!loading && (
            <div class="bio-container">
              {description && (
                <>
                  <p class="biodata">{description}</p>
                </>
              )}
              {aquiferData.type === "acai:places" && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Navigation</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      <button
                        onClick={() => {
                          handleMapNav({ data: aquiferData });
                        }}
                      >
                        Locate {title}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {aquiferData.group_origin &&
                aquiferData.group_origin.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Group Origin</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.group_origin.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.partners && aquiferData.partners.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Partners</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {aquiferData.partners.map((item, index) => {
                        return (
                          <button
                            onClick={() => {
                              LoadData({ uid: item.uid });
                            }}
                          >
                            {item.localizations?.eng?.preferred_label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {aquiferData.offspring && aquiferData.offspring.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Childrens</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {aquiferData.offspring.map((item, index) => {
                        return (
                          <button
                            onClick={() => {
                              LoadData({ uid: item.uid });
                            }}
                          >
                            {item.localizations?.eng?.preferred_label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {aquiferData.siblings && aquiferData.siblings.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Siblings</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {aquiferData.siblings.map((item, index) => {
                        return (
                          <button
                            onClick={() => {
                              LoadData({ uid: item.uid });
                            }}
                          >
                            {item.localizations?.eng?.preferred_label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {aquiferData.tribe && aquiferData.tribe.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Tribe</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {aquiferData.tribe.map((item, index) => {
                        return (
                          <button
                            onClick={() => {
                              LoadData({ uid: item.uid });
                            }}
                          >
                            {item.localizations?.eng?.preferred_label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {aquiferData.birth_place &&
                aquiferData.birth_place.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Birth Place</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.birth_place.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.death_place &&
                aquiferData.death_place.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Death Place</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.death_place.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.possibly_same_as &&
                aquiferData.possibly_same_as.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Possibly same as</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.possibly_same_as.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.referred_to_as &&
                aquiferData.referred_to_as.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Also Referred as</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.referred_to_as.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.associated_places &&
                aquiferData.associated_places.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Associated Places</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.associated_places.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.nearby_places &&
                aquiferData.nearby_places.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Nearby Places</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.nearby_places.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {aquiferData.subregion_of &&
                aquiferData.subregion_of.length > 0 && (
                  <>
                    <div class="divider"></div>
                    <b>
                      <span>Subregion of</span>
                    </b>
                    <div
                      class="available-events-item"
                      style={{ height: "fit-content" }}
                    >
                      <div class="event-results">
                        {aquiferData.subregion_of.map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                LoadData({ uid: item.uid });
                              }}
                            >
                              {item.localizations?.eng?.preferred_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              {theoGraphicData && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Additional Data from Theographic Bible</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {theoGraphicData.map((item) => {
                        return (
                          <button
                            onClick={() => {
                              createTimeLine({
                                personData: item,
                                prevData: [...prevData, aquiferData],
                              });
                            }}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

return App;
