os.unregisterApp("hideAndSeekSideBar");
os.registerApp("hideAndSeekSideBar");

const { useState, useEffect, useCallback } = os.appHooks;
const SearchBarHideAndSeek = await thisBot.SearchBarHideAndSeek();

const HideSeekUIBar = () => {

    const [openSidebar, setStateSideBar] = useState(false);

    const setOpenSidebar = useCallback((val) => {
        globalThis.SearchBarHideAndSeek = val;
        setStateSideBar(val);
    }, [])

    useEffect(() => {
        globalThis.hideAndSeekSidebar = setOpenSidebar;

        return () => {
            globalThis.hideAndSeekSidebar = false;
        }
    }, [])

    return <>
        <style>{thisBot.tags['google-icon.css']}</style>
        <style>{thisBot.tags["App.css"]}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        {openSidebar && <>
            <div class={`sidebar-container solo ${openSidebar ? "open-toggle-solo" : openSidebar === null ? "" : "close-toggle"}`}>
                <div class="sidebar-toggle" style={{ 'z-index': 2 }}>
                    <span
                        onCLick={() => {
                            setOpenSidebar(!openSidebar);
                            if (openSidebar) {
                                setCurrentExperience(0);
                                setQuery("");
                                shout("playSound", { soundName: "SidebarOpen" });
                            } else {
                                shout("playSound", { soundName: "SidebarClose" });
                            }
                        }}
                        class={`material-symbols-outlined show-chapters borderStyle showIcon`}
                    >
                        {!openSidebar ? "search" : "close"}
                    </span>
                </div>
            </div>
            <div
                id="sidebar-bar"
                class={`sidebar ${openSidebar ? "open-sideBar" : openSidebar === null ? "" : "close-sideBar"}`}
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
            >
                <SearchBarHideAndSeek />
            </div>
        </>}
    </>

}

os.compileApp("hideAndSeekSideBar", <HideSeekUIBar />);