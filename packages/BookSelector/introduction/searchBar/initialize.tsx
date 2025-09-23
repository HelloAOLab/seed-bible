if (configBot.tags.systemPortal) return;
await os.unregisterApp('searchBar');
await os.registerApp('searchBar', thisBot);
const css = thisBot.tags["App.css"];
const { useState, useEffect, useMemo, useCallback } = os.appHooks;
if (typeof introductionSearchBar === "undefined") {
    globalThis.introductionSearchBar = thisBot;
}

if (!masks.index)
    masks.index = 0
const SearchBar = thisBot.SearchBar();

const App = () => {
    const [openSidebar, setOpenSidebar] = useState(false);
    const [currentExperience, setCurrentExperience] = useState(0);
    globalThis.setCurrentExperience = setCurrentExperience
    globalThis.currentExperience = currentExperience
    const [isUsersHidden, setHideUsers] = useState(false)
    const [transIcon, setTransIcon] = useState(true)
    const [Name, setName] = useState(masks["currentTray"] ? getBot('id', masks["currentTray"]).tags.currentBook : 'GRID')
    const [theDimension, setDimension] = useState(masks['currentDimension'] || 'home')
    const [dimensionNum, setDimensionNum] = useState(masks['currentDimensionNum'] || 1)
    const [options, setOptions] = useState(false)
    const [update, setUpdate] = useState(false)
    globalThis.setOptions = setOptions
    // Define a dynamic experiences object
    const [experiences, setExperiences] = useState({
        0: <SearchBar />,
    });
    globalThis.SetExperiences = setExperiences
    // Memoize the current experience based on `currentExperience`
    const Experience = useMemo(() => thisBot.SearchBar(), [openSidebar]);



    globalThis.setOpenSidebar = setOpenSidebar;
    globalThis.openSidebar = openSidebar;
    globalThis.currentExperience = currentExperience;
    globalThis.setCurrentExperience = setCurrentExperience;

    function Swap(direaction) {
        let bots = SortBots()
        if (direaction === 'up' && masks.index !== bots.length - 1)
            masks.index++
        else if (direaction === 'down' && masks.index !== 0)
            masks.index--
        else if (masks.index === 0)
            masks.index = bots.length - 1
        else if (masks.index === bots.length - 1)
            masks.index = 0
        // os.log(bots[masks.index])
        let current = getBot('id', bots[masks.index][1])
        current.onPointerEnter()
        os.focusOn(current, { zoom: 20, space: 'local' })
    }

    const SortBots = useCallback(() => {
        const bots = getBots("unhighlighting")
        const tempArray = []
        for (const bot of bots) {
            tempArray.push([bot.tags[dim + 'Z'], bot.id])
        }
        // os.log(tempArray)
        return tempArray.sort((a, b) => a[0] - b[0]).reverse();
    }, [])
    useEffect(() => {
        const interval = setInterval(() => {
            setName(masks["currentTray"] && masks["currentTray"] !== null ? getBot('id', masks["currentTray"]).tags.currentBook : 'Canvas')
        }, 10)
        return () => clearInterval(interval);
    }, [])

    return <>
        <style>{css}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        {false && <div class={`sidebar-container experience_id-${currentExperience} ${openSidebar ? "open-toggle" : openSidebar === null ? "" : "close-toggle"}`}>
            {null/*<span
                onClick={() => {
                    CloseAllInNav()
                    shout("playSound", { soundName: "SidebarClose" });
                    setOpenSidebar(false);
                    if (setQuery) {
                        setQuery("");
                    }
                }}
                class="borderStyle material-symbols-outlined"
            >
                close
            </span>*/}
        </div>}
        <>
            <div
                id="sidebar-bar"
                style={{ zIndex: '9999', background: 'white !important' }}
                onPointerEnter={(e) => {
                    if (e.currentTarget.id === "sidebar-bar") {
                        setTagMask(gridPortalBot, "portalZoomable", false);
                    }
                }}
                onPointerLeave={(e) => {
                    if (e.currentTarget.id === "sidebar-bar") {
                        setTagMask(gridPortalBot, "portalZoomable", true);
                    }
                }}
                class={`sidebar experience_id-${currentExperience} ${openSidebar ? "open-sideBar" : openSidebar === null ? "close-sideBar" : "close-sideBar"}`}>
                <style>
                    {
                        `
                      :root {
                        --mobileWidth: ${currentExperience === 3 ? '100%' : '200px'};
                        }
                    `
                    }
                </style>
                <SearchBar />
            </div>
        </>
    </>
}

function generateQuery(params) {
    let queryArray = [];
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

// Function to attach query string to URL
function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}

let thePage = getBot('system', 'app.components')

const setTranslation = async () => {
    if (!thePage.masks?.selectedTranslation) {
        return
    }
    let translationId = configBot.tags.translationId

    if (!translationId) {
        console.log("changing translation 2")
        let selectedTranslation = thePage.masks?.selectedTranslation;
        if (selectedTranslation?.listOfBooksApiLink?.includes("https")) {
        console.log("changing translation 3")
            web.get(`${selectedTranslation.listOfBooksApiLink}`).then(e => {
                let book0 = e.data.books[0];
                console.log(selectedTranslation.id, book0, selectedTranslation.origin, "changing translation 5")
                ChangeTranslation(selectedTranslation.id, book0, selectedTranslation.origin);
            }).catch(e => {
                console.log(e)
            })
        } else {
        console.log("changing translation 4")
            web.get(`https://bible.helloao.org/api/${selectedTranslation.id}/books.json`).then(e => {
                let book0 = e.data.books[0];
                ChangeTranslation(selectedTranslation.id, book0, "https://bible.helloao.org");
            }).catch(e => {
                console.log(e)
            })
        }
    }
}

const tr = () => {
    if (globalThis?.ChangeTranslation) {
        console.log("changing translation")
        setTranslation()
    } else {
        setTimeout(() => {
            tr()
        }, 500)
    }
}

tr()

os.compileApp('searchBar', <App />);
