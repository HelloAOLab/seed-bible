let dim = os.getCurrentDimension();
const css = thisBot.tags["App.css"];
await os.unregisterApp("placeSlider");
await os.registerApp("placeSlider", thisBot);

const { useEffect, useState, useRef, useCallback } = os.appHooks;

// let timeLine = [...that.timeline.sort((a, b) => { return a.startDate - b.startDate })];
// let name = that.personData.name;

const personData = that?.personData;

function App() {
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [currentMode, setCurrentMode] = useState("biodata");

  const changePosition = (e) => {
    setSliderValue(e.target.value);
  };

  useEffect(() => {
    if (globalThis.eventToolApp) {
      RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
      globalThis.EVENT_PANEL_ID = null;
      globalThis.eventToolApp = false;
    }
    if (App) {
      let id = uuid();
      globalThis.eventToolApp = true;
      globalThis.EVENT_PANEL_ID = id;
      AddApplication({
        id,
        App: (
          <EventInfo
            prevData={that?.prevData ? [...that.prevData] : []}
            personData={that.personData}
            sliderValue={sliderValue}
            setCurrentModeP={setCurrentMode}
            setMax={setMax}
            id={id}
          />
        ),
        minWidth: "23rem",
      });
    }
  }, [sliderValue]);

  return (
    <>
      <style>{tags["Slider.css"]}</style>
      {max > min && currentMode === "event" && (
        <div className="slider-main">
          <div class="slide-container">
            <input
              onChange={(e) => changePosition(e)}
              type="range"
              min={min}
              max={max}
              value={sliderValue}
              class="slider-input"
              id="myRange"
            />
          </div>
        </div>
      )}
    </>
  );
}

const EventInfo = ({
  personData,
  setCurrentModeP,
  setMax,
  sliderValue,
  prevData,
}: {
  personData: any;
  setCurrentModeP: any;
  setMax: any;
  sliderValue: any;
  prevData: any;
  id?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [currentMode, setCurrentMode] = useState("biodata");
  const [eventData, setEventData] = useState(null);
  const [retrievedPersonData, setRetrievedPersonData] = useState(null);
  const [timeLine, setTimeLine] = useState(null);
  const [aquiferData, setAquiferData] = useState(null);

  const handleNav = useCallback(async () => {
    if (currentMode === "biodata") {
      if (prevData.length === 0) {
        if (globalThis.eventToolApp) {
          RemoveApplicationByID(globalThis.EVENT_PANEL_ID);
          globalThis.EVENT_PANEL_ID = null;
          globalThis.eventToolApp = false;
        }
        let App = await getBot(
          "system",
          "ext_canvas.eventTool"
        ).initInterface();
        if (App) {
          let id = uuid();
          globalThis.eventToolApp = true;
          globalThis.EVENT_PANEL_ID = id;
          AddApplication({
            id,
            App: (
              <App
                initPage={1}
                selectedRepo={{ type: "theograph", repo: 0 }}
                id={id}
              />
            ),
            minWidth: "23rem",
          });
        }
      } else {
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
          whisper(thisBot, "CreateTimeLine", {
            personData: {
              title: prevPerson.title,
              uid: prevPerson.uid,
            },
            prevData: [...tempPrevData],
          });
        }
      }
    } else {
      setCurrentMode("biodata");
      setCurrentModeP("biodata");
    }
  }, [currentMode]);

  const loadPeople = ({ people }) => {
    if (people.name === personData.title) {
      whisper(thisBot, "CreateTimeLine", {
        personData: {
          title: people.name,
          uid: people.uid,
        },
        prevData: [...prevData],
      });
    } else {
      whisper(thisBot, "CreateTimeLine", {
        personData: {
          title: people.name,
          uid: people.uid,
        },
        prevData: [
          ...prevData,
          {
            ...personData,
          },
        ],
      });
    }
  };

  const AquiferInfo = useCallback(async () => {
    let peopleApis = { ...globalThis.aquiferApis.people };
    let params = {
      query: personData.title,
    };
    let queryUrl = peopleApis.searchItem;
    queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
    let result = await web.hook({
      method: "GET",
      url: queryUrl,
    });
    if (result.status === 200) {
      console.log(result.data.data);
    }
  }, [personData]);

  const LoadData = ({ uid }) => {
    if (!uid || uid === undefined) {
      return;
    }
    setLoading(true);
    let params = {
      uid,
    };
    let queryUrl = aquiferApis.people.getItemByUid;
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
                prevData={[...prevData, personData]}
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

  useEffect(async () => {
    if (eventData && !loading) {
      if (!configBot.tags.miniMapPortal) {
        await animateTag(miniMapPortalBot, {
          fromValue: {
            miniPortalWidth: 0.1,
            miniPortalHeight: 0.2,
          },
          toValue: {
            miniPortalWidth: 1,
            miniPortalHeight: 1,
          },
          duration: 1,
        });
        await os.sleep(500);
        configBot.tags.miniMapPortal = "map_portal";
      }
      if (eventData.locations.length > 0) {
        let tempPlaces = [];
        let uniqueArr = eventData["places (from verses)"].filter(
          (value, index, self) => self.indexOf(value) === index
        );
        for (let i = 0; i < uniqueArr.length; i++) {
          for (let j = 0; j < eventData.locations.length; j++) {
            if (uniqueArr[i] === eventData.locations[j].uid) {
              tempPlaces.push(eventData.locations[j]);
            }
          }
        }
        setPlaces([...tempPlaces]);
      }
    }
  }, [eventData, loading]);

  useEffect(() => {
    if (places.length > 0 && eventData && !loading) {
      console.log(places, eventData["places (from verses)"]);
      let sideBar = getBot("system", "ext_canvas.sideBar");
      let name = places[0].kjvName.toLowerCase();
      if (sideBar.tags["places-new"][name]) {
        shout("handleGeoJsonSearch", {
          place: sideBar.tags["places-new"][name],
        });
      } else {
        let geojson = {
          geometry: {
            coordinates: [places[0].latitude, places[0].longitude],
            type: "Point",
          },
          properties: {
            id: places[0].displayTitle,
          },
          type: "Feature",
        };
        shout("handleGeoJsonSearch", { geojson });
      }
    }
  }, [places, eventData, loading]);

  useEffect(() => {
    if (!loading && timeLine) {
      setEventData(timeLine[sliderValue]);
    }
  }, [sliderValue, timeLine]);

  useEffect(async () => {
    AquiferInfo();
    let params = {
      uid: personData.uid,
    };
    let queryUrl = eventApis.peoples.getItemByUid;
    queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
    let personDataReq = await web.get(queryUrl);
    if (personDataReq.status === 200) {
      let fetchPromises = [];

      console.log("Raw tie", personDataReq.data.data);
      personDataReq.data.data.timeline.forEach((item) => {
        let params = {
          uid: item,
        };
        let queryUrl = eventApis.events.getItemByUid;
        queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
        console.log(queryUrl, "url");
        fetchPromises.push(web.get(queryUrl));
      });

      let results = await Promise.all(fetchPromises);

      results = results.map((item) => {
        return item.data.data;
      });

      // whisper(thisBot, "CreateTimeLine", { timeline: results, personData: personDataReq.data.data })
      setRetrievedPersonData(personDataReq.data.data);
      setTimeLine([
        ...results.sort((a, b) => {
          return a.startDate - b.startDate;
        }),
      ]);
      console.log("timeline", [...results]);
      setMax(results.length - 1);
    }
    setLoading(false);
  }, [personData]);

  useEffect(async () => {
    if (personData) {
      let params = {
        query: personData.title,
      };
      let queryUrl = aquiferApis.people.searchItem;
      queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
      let personDataReq = await web.get(queryUrl);
      if (personDataReq.data.data.length > 1) {
        console.log(personDataReq.data.data, "personDataReq");
        setAquiferData([...personDataReq.data.data]);
      }
    }
  }, [personData]);

  return (
    <>
      <div class="experience-container">
        <style>{css}</style>
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
            <span class="experience_title">
              {personData.title}{" "}
              {currentMode === "biodata" ? "Theographic Info" : "Events"}
            </span>
          </div>
          <button onClick={handleNav} class="experience_title_back">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div class="experience-body" style={{ height: "100%" }}>
          {currentMode === "event" && !loading && eventData && (
            <>
              <h2>{eventData.title}</h2>
              <h5>Start Date</h5>
              <h6>
                {eventData.startDate < 0
                  ? `${eventData.startDate * -1} AD`
                  : `${eventData.startDate} BC`}
              </h6>
              <h5>Duration</h5>
              <h6>{eventData.duration}</h6>
              {places.length > 0 && (
                <>
                  <h5>Locations</h5>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {places.map((item, index) => {
                        return (
                          <button
                            onClick={() => {
                              let sideBar = getBot(
                                "system",
                                "ext_canvas.sideBar"
                              );
                              let name = places[index].kjvName.toLowerCase();
                              if (sideBar.tags["places-new"][name]) {
                                shout("handleGeoJsonSearch", {
                                  place: sideBar.tags["places-new"][name],
                                });
                              } else {
                                let geojson = {
                                  geometry: {
                                    coordinates: [
                                      item.latitude,
                                      item.longitude,
                                    ],
                                    type: "Point",
                                  },
                                  properties: {
                                    id: item.displayTitle,
                                  },
                                  type: "Feature",
                                };
                                shout("handleGeoJsonSearch", { geojson });
                              }
                            }}
                          >
                            {item.displayTitle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {eventData.participants.length > 0 && (
                <>
                  <h5>Participants</h5>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {eventData.participants.map((item, index) => {
                        return (
                          <button
                            onClick={async () => {
                              loadPeople({ people: item });
                            }}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          {currentMode === "biodata" && !loading && retrievedPersonData && (
            <div class="bio-container">
              {retrievedPersonData.dictText[0] !== null &&
                retrievedPersonData.dictText[0] !== "" && (
                  <>
                    <p class="biodata">{retrievedPersonData.dictText[0]}</p>
                    <div class="divider"></div>
                  </>
                )}
              <button
                onClick={() => {
                  setCurrentMode("event");
                  setCurrentModeP("event");
                }}
              >
                Explore {personData.title} Events
              </button>
              {retrievedPersonData.father.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Fore Fathers</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {retrievedPersonData.father
                        .sort((a, b) => a.personID - b.personID)
                        .map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                loadPeople({ people: item });
                              }}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {retrievedPersonData.mother.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Fore Mothers</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {retrievedPersonData.mother
                        .sort((a, b) => a.personID - b.personID)
                        .map((item, index) => {
                          return (
                            <button onClick={() => {}}>{item.name}</button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {retrievedPersonData.siblings.length > 0 && (
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
                      {retrievedPersonData.siblings
                        .sort((a, b) => a.personID - b.personID)
                        .map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                loadPeople({ people: item });
                              }}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {retrievedPersonData.children.length > 0 && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Decendants</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {retrievedPersonData.children
                        .sort((a, b) => a.personID - b.personID)
                        .map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                loadPeople({ people: item });
                              }}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {retrievedPersonData.partners.length > 0 && (
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
                      {retrievedPersonData.partners
                        .sort((a, b) => a.personID - b.personID)
                        .map((item, index) => {
                          return (
                            <button
                              onClick={() => {
                                loadPeople({ people: item });
                              }}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
              {aquiferData && (
                <>
                  <div class="divider"></div>
                  <b>
                    <span>Additional Data from Aquifer</span>
                  </b>
                  <div
                    class="available-events-item"
                    style={{ height: "fit-content" }}
                  >
                    <div class="event-results">
                      {aquiferData.map((item) => {
                        return (
                          <button
                            onClick={() => {
                              LoadData({ uid: item.uid });
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
        </div>
      </div>
    </>
  );
};

os.compileApp("placeSlider", <App />);
