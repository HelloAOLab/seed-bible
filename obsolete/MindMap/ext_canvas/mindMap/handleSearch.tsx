let { query } = that;

query = query.toLowerCase();

const searchInBook = ({ query }) => {
    console.log("searching books");
    let formMenuBot = getBot('system', 'baseElements.formMenu');
    let bookPromise = formMenuBot.bookData();
    Promise.resolve(bookPromise).then(async (books) => {
        for (let book of books) {
            if (book.commonName.toLowerCase().includes(query) || book.id.toLowerCase().includes(query)) {
                console.log(query, book.commonName)
                setCurrentExperience(0);
                setOpenSidebar(true);
                await os.sleep(20);
                SetQuery(query);
                return true
            }
        }
        return false
    }).catch((e) => {
        return false
    });
    return false
}

const openLocationTab = async ({ query }) => {
    const GeoJSONApp = getBot("system", "introduction.searchBar").GeoJSONExperience()
    SetOpenThePanal(true);
    SetSideApp({
        app: <><GeoJSONApp /></>,
        appName: "GeoJSON"
    })
    await os.sleep(50)
    setLocationSearch(query)
}

const openLocationOnMap = async ({ query }) => {
    const typingTool = getBot(byTag("typingTool"));
    let sideBar = getBot('system', 'ext_canvas.sideBar');
    let controlBot = getBot(byID(that.controlBotId));
    let dim = os.getCurrentDimension();
    shout("handleGeoJsonSearch", { place: sideBar.tags['places-new'][query] });
    shout("createCloseButton", {
        close: async () => {
            // SetIsTray(true);
            await os.sleep(1000)
            SetSplitterPointerEvent("none")
        }
    });
    let locationBot = await whisper(typingTool, "makeTextBox", {
        x: controlBot.tags[dim + "X"], y: controlBot.tags[dim + "Y"], label: `^ ${query}`, config: {
            onClick: `@
                let sideBar = getBot('system', 'ext_canvas.sideBar');
                shout("handleGeoJsonSearch", { place: sideBar.tags['places-new'][tags.query] });
                shout("createCloseButton", {
                    close: async () => {
                        await os.sleep(1000)
                        SetSplitterPointerEvent("none")
                    }
                });
            `,
            onCreate: null,
            onDrag: null,
            onDrop: null,
            controlBotId: controlBot.tags.id,
            query,
            opacity: 1
        }
    })[0].bot;
    whisper(typingTool, "removeMenuButtons");
    destroy(controlBot);
}

const searchInLocations = ({ query }) => {
    console.log("searching locations");
    let sideBar = getBot('system', 'ext_canvas.sideBar');
    if (sideBar.tags['places-new'][query]) {
        return true
    } else {
        for (let place of Object.keys(sideBar.tags['places-new'])) {
            if (place.toLowerCase().includes(query)) {
                console.log(place)
                return true
            }
        }
        return false
    }
}

const openEventTab = async ({ query }) => {
    const App = await getBot('system', "ext_canvas.eventTool").initInterface()
    SetOpenThePanal(true);
    SetSideApp({
        app: <><App /></>,
        appName: "Data Ocean"
    })
    await os.sleep(50)
    setPage(1);
    await os.sleep(50)
    setEventQuery(query);
}

const addEventOnCanvas = async ({ query }) => {
    const typingTool = getBot(byTag("typingTool"));
    let eventTool = getBot('system', 'ext_canvas.eventTool');
    try {
        sendIcon({ type: 'loading', trayColor: "#ffffff", dragerColor: "#000000", action: null });
    } catch { () => { } }
    let params = {
        uid: eventTool.tags.places[query]
    };
    let queryUrl = globalThis.eventApis.places.getItemByUid;
    queryUrl = eventUtils.attachQueryToURL(queryUrl, params);
    os.toast("Please wait while we get the event data about this place");
    web.hook({
        method: "GET",
        url: queryUrl
    }).then((e) => {
        os.toast("Click on a text bot to load it", 3);
        globalThis.eventData = e.data.data;
        try {
            // sendIcon({ type: 'timeLine', trayColor: "#ffffff", dragerColor: "#000000", action: null });
            let controlBot = getBot(byID(that.controlBotId));
            let dim = os.getCurrentDimension();
            shout("createEventBot", {
                eventBotData: e.data.data, position: {
                    x: controlBot.tags[dim + "X"],
                    y: controlBot.tags[dim + "Y"]
                }
            });
            sendIcon(null);
            whisper(typingTool, "removeMenuButtons");
            destroy(controlBot);
        } catch { () => { } }
    }).catch(() => {
        setLoading(false);
        os.toast("Unable to receive data")
    });
}

const searchInEvents = ({ query }) => {
    console.log("searching events");
    let eventTool = getBot('system', 'ext_canvas.eventTool');
    if (eventTool.tags.places[query]) {
        return true
    } else {
        for (let place of Object.keys(eventTool.tags.places)) {
            if (place.toLowerCase().includes(query)) {
                return true
            }
        }
        return false
    }
}

if (that?.type) {
    switch (that.type) {
        case "location": {
            let sideBar = getBot('system', 'ext_canvas.sideBar');
            if (sideBar.tags['places-new'][query]) {
                openLocationOnMap({ query });
            } else {
                openLocationTab({ query });
            }
            return
        }
        case "event": {
            let eventTool = getBot('system', 'ext_canvas.eventTool');
            if (eventTool.tags.places[query]) {
                addEventOnCanvas({ query });
            } else {
                openEventTab({ query });
            }
            return
        }
    }
    return
}

if (query && query !== "" && query !== " ") {
    let controlBot = getBot(byID(that.controlBotId));
    let dim = os.getCurrentDimension();
    const typingTool = getBot(byTag("typingTool"));
    if (searchInBook({ query })) {
        return
    } else if (searchInLocations({ query }) && searchInEvents({ query })) {
        console.log("blocked", searchInLocations({ query }), searchInEvents({ query }))
        let locationBot = await whisper(typingTool, "makeTextBox", {
            x: controlBot.tags[dim + "X"], y: controlBot.tags[dim + "Y"], label: "location", config: {
                onClick: `@
                shout("handleSearch", {query: tags.query, type: "location", controlBotId: tags.controlBotId})
                let controlBot = getBot(byID(tags.controlBotId));
                destroy(controlBot.tags.lineTo)
            `,
                onCreate: null,
                onDrag: null,
                onDrop: null,
                controlBotId: controlBot.tags.id,
                query,
                opacity: 0
            }
        })[0].bot;
        let eventBot = whisper(typingTool, "makeTextBox", {
            x: controlBot.tags[dim + "X"], y: controlBot.tags[dim + "Y"], label: "event", config: {
                onClick: `@
                shout("handleSearch", {query: tags.query, type: "event", controlBotId: tags.controlBotId})
                let controlBot = getBot(byID(tags.controlBotId));
                destroy(controlBot.tags.lineTo)
            `,
                onCreate: null,
                onDrag: null,
                onDrop: null,
                query,
                controlBotId: controlBot.tags.id,
                opacity: 0
            }
        })[0].bot;

        controlBot.tags.lineTo = [locationBot.tags.id, eventBot.tags.id]

        animateTag(locationBot, {
            fromValue: {
                [dim + "X"]: controlBot.tags[dim + "X"],
                [dim + "Y"]: controlBot.tags[dim + "Y"],
                opacity: 0
            },
            toValue: {
                [dim + "X"]: controlBot.tags[dim + "X"] + 10,
                [dim + "Y"]: controlBot.tags[dim + "Y"] + 1,
                opacity: 1
            },
            duration: 0.3
        })
        animateTag(eventBot, {
            fromValue: {
                [dim + "X"]: controlBot.tags[dim + "X"],
                [dim + "Y"]: controlBot.tags[dim + "Y"],
                opacity: 0
            },
            toValue: {
                [dim + "X"]: controlBot.tags[dim + "X"] + 10,
                [dim + "Y"]: controlBot.tags[dim + "Y"] - 1,
                opacity: 1
            },
            duration: 0.3
        })
        return
    } else if (searchInLocations({ query })) {
        let sideBar = getBot('system', 'ext_canvas.sideBar');
        if (sideBar.tags['places-new'][query]) {
            openLocationOnMap({ query });
        } else {
            openLocationTab({ query });
        }
        return
    } else if (searchInEvents({ query })) {
        let eventTool = getBot('system', 'ext_canvas.eventTool');
        if (eventTool.tags.places[query]) {
            addEventOnCanvas({ query });
        } else {
            openEventTab({ query });
        }
        return
    }
}