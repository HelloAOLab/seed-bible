if (configBot.tags.systemPortal) return;
await os.unregisterApp('searchBar');
await os.registerApp('searchBar', thisBot);
const css = thisBot.tags["App.css"];
const { useState, useEffect } = os.appHooks;
if (typeof introductionSearchBar === "undefined") {
    globalThis.introductionSearchBar = thisBot;
}

if (!masks.index)
    masks.index = 0
const SearchBar = thisBot.SearchBar();

const App = () => {
    const [openSidebar, setOpenSidebar] = useState(false);
    const [currentExperience, setCurrentExperience] = useState(0);

    globalThis.setOpenSidebar = setOpenSidebar;
    globalThis.openSidebar = openSidebar;
    globalThis.currentExperience = currentExperience;
    globalThis.setCurrentExperience = setCurrentExperience;

    useEffect(() => {
        if(!openSidebar && globalThis?.bookModalOpen){
            globalThis.bookModalOpen(false);
        }
    }, [openSidebar])

    return <>
        <style>{css}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap" rel="stylesheet" />
        <>
            <div
                id="sidebar-bar"
                style={{ zIndex: '9999', background: 'white !important' }}
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

os.compileApp('searchBar', <App />);
