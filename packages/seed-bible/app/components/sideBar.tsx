import { getStyleOf } from 'app.styles.styler';
import { useTabsContext } from 'app.hooks.tabs';
import { useMouseMove, useClickAndHold } from 'app.hooks.mouseMove';
import { DualScreenIcon, ThreeScreenIcon, QuadScreenIcon, SingleScreenIcon, MenuIcon } from 'app.components.icons'
import { useBibleContext } from 'app.hooks.bibleVariables'
import { useSideBarContext } from 'app.hooks.sideBar'
import SurroundingDivs from 'app.components.surroundingDivs'
import { FolderIcon, OpenFolderIcon } from 'app.components.icons'
import {
    ImportSpaceModal, RenameSpaceModal,
    CreateNewSpaceModal
} from 'app.components.spaceSettings'
const { useState, useRef, useEffect } = os.appHooks;
function Tab({ el, activeTab, setActiveTab, setIsDragging, setElement, collapsed }) {
    const { openPopupSettings, closePopupSettings } = useSideBarContext();
    const { setCanvasMode, setMapMode } = useBibleContext();
    const { removeTab } = useTabsContext()
    const OPTIONS = {

        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'Delete tab', onClick: () => { removeTab(el.id); closePopupSettings() } },
            { icon: <MenuIcon name="edit" />, title: 'Edit mode', onClick: () => { globalThis[`SetEnableEditorOf${el.id}`](prev => !prev); closePopupSettings() } },
        ]
    }
    return (
        <div
            onMouseDown={() => {
                // console.log('tab mouse down', el);
                setIsDragging(true);
                setElement({ App: <Tab el={el} activeTab={activeTab} setActiveTab={setActiveTab} setIsDragging={setIsDragging} setElement={setElement} />, data: el });
            }}
            onClick={async () => {
                setActiveTab(el.id);
                globalThis.UpdateTab(el)
                if (el.data.type === 'canvas') {
                    configBot.tags.miniMapPortal = null;
                    setMapMode(false);
                    setCanvasMode(true)
                } else if (el.data.type === 'map') {
                    setMapMode(true);
                    setCanvasMode(true)
                    if (!configBot.tags.miniMapPortal) {
                        await animateTag(miniMapPortalBot, {
                            fromValue: {
                                miniPortalWidth: 0.1,
                                miniPortalHeight: 0.2
                            },
                            toValue: {
                                miniPortalWidth: 1,
                                miniPortalHeight: 1
                            },
                            duration: 1
                        });
                        await os.sleep(500);
                        configBot.tags.miniMapPortal = "map_portal";
                    }
                } else {
                    configBot.tags.miniMapPortal = null;
                    setCanvasMode(false)
                    setMapMode(false);
                }
            }}
            className={`${activeTab === el.id && !collapsed ? 'activeTab' : activeTab === el.id && collapsed ? 'activeTabCollapsed' : 'tab'}`}
        >
            {!collapsed ? (
                <>
                    <div className="tabInfo">
                        <span className="tabIcon">
                            <span className="material-symbols-outlined">
                                {el?.data?.type === 'book'
                                    ? 'description'
                                    : el?.data?.type === 'canvas'
                                        ? 'deployed_code'
                                        : el?.data?.type === 'map'
                                            ? 'map'
                                            : null}
                            </span>
                        </span>
                        <span className="tabName">
                            {el?.data?.type === 'map'
                                ? 'map'
                                : `${el?.data?.book} - ${el?.data?.chapter}`}
                        </span>
                    </div>
                    {activeTab === el.id && <span onClick={() => { openPopupSettings(OPTIONS); }} style={{ display: activeTab ? '' : 'none' }} className="material-symbols-outlined ">
                        more_vert
                    </span>}
                </>
            ) : (
                <div className="tabInfoCollapsed">
                    <span className="tabIcon">
                        <span className="material-symbols-outlined">
                            {el?.data?.type === 'book'
                                ? 'description'
                                : el?.data?.type === 'canvas'
                                    ? 'deployed_code'
                                    : el?.data?.type === 'map'
                                        ? 'map'
                                        : null}
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}

function Folder({ folder, collapsed }) {
    const {
        setActiveTab, activeTab, removeFolder, addTabToFolder
    } = useTabsContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const [open, setOpen] = useState(true)
    const { moveTab } = useTabsContext();
    const [tabEntered, setTabEntered] = useState(false)
    const { openPopupSettings, closePopupSettings } = useSideBarContext();

    function handleMouseEnter() {
        if (!isDragging)
            return
        setTabEntered(true)
    }
    function handleMouseLeave() {
        if (!isDragging)
            return
        setTabEntered(false)
    }
    function handleMouseUp() {
        if (!isDragging)
            return
        moveTab(Element.data.id, folder.id);
        setTabEntered(false)
    }
    const OPTIONS = {

        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'delete folder', onClick: () => { removeFolder(folder.id); closePopupSettings() } },
        ]
    }
    return <div style={{ 'border-raduis': '8px', border: tabEntered ? '1px black dashed' : '' }} key={folder.id} onPointerEnter={handleMouseEnter} onPointerLeave={handleMouseLeave} onPointerUp={handleMouseUp} className="folder">
        <div onClick={() => setOpen(!open)} className="folderHeader">
            {open ? <MenuIcon name="folder_open" /> : <MenuIcon name={'folder'} />}
            {!collapsed && <span>{folder.name}</span>}
            <span onClick={() => { openPopupSettings(OPTIONS) }} className="material-symbols-outlined ">
                more_vert
            </span>
        </div>
        {open && <div style={{ 'margin-left': collapsed ? '0px' : null }} className="folderTabs">
            {folder.tabs.map(el => (
                <Tab
                    key={el.id}
                    el={el}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setIsDragging={setIsDragging}
                    setElement={setElement}
                    collapsed={collapsed}
                />
            ))}
            {null/*<button className="addTabToFolder" onClick={() => addTabToFolder(folder.id, { id: uuid(), taken: false, data: { type: 'book', book: 'Exodus', chapter: 1 } })}>
                + Add Tab
            </button>*/}
        </div>}
    </div>
}

function SideBar() {
    const {
        tabs, folders, addTab, removeTab, setActiveTab, activeTab,
        addFolder, removeFolder, addTabToFolder, moveTab, currentSpace,
        updateSpace, activeSpace
    } = useTabsContext();
    const { screens, setScreens, setCanvasMode } = useBibleContext();
    useEffect(() => {
        updateSpace(activeSpace, {
            screens: screens
        });
        if (screens) {

            masks[activeSpace] = screens
            os.log(masks[activeSpace], activeSpace, 'masks[activeSpace]')
        }
    }, [screens])
    const { sidebarMode, setSideBarMode, collapsed, setCollapsed, openPopupSettings, closePopupSettings } = useSideBarContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const [tabEntered, setTabEntered] = useState(false)
    function handleMouseEnter() {
        if (!isDragging)
            return
        setTabEntered(true)
    }
    function handleMouseLeave() {
        if (!isDragging)
            return
        setTabEntered(false)
    }
    function handleMouseUp() {
        if (!isDragging)
            return
        moveTab(Element.data.id);
        setTabEntered(false)
    }
    // Function to toggle sidebar collapse state
    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };
    const ScreenOptions = {
        type: 'normal', items: [
            { icon: <SingleScreenIcon />, title: '1 Panel', onClick: () => { setScreens(1) } },
            { icon: <DualScreenIcon />, title: '2 Panels', onClick: () => { setScreens(2) } },
            { icon: <ThreeScreenIcon />, title: '3 Panels', onClick: () => { setScreens(3) } },
            { icon: <QuadScreenIcon />, title: '4 Panels', onClick: () => { setScreens(4) } },
        ]
    }
    const MenuOptions = {
        type: 'normal', items: [
            { icon: <MenuIcon name="logout" />, title: 'Join a Lobby', onClick: () => { } },
            { type: 'line' },
            { icon: <MenuIcon name="search" />, title: 'Search', onClick: () => { } },
            { icon: <MenuIcon name="extension" />, title: 'Extensions', onClick: () => { } },
            { type: 'line' },
            {
                icon: <MenuIcon name="bug_report" />, title: 'Export Calendar', onClick: async () => {
                    shout("exportAux")
                }
            },
            { type: 'line' },
            {
                icon: <MenuIcon name="bug_report" />, title: 'Publish', onClick: async () => {
                    shout("onChat", {message: ".publish"})
                }
            },
            { type: 'line' },
            { icon: <MenuIcon name="bug_report" />, title: 'Report a bug', onClick: () => { } },
            { icon: <MenuIcon name="help" />, title: 'Help', onClick: () => { } },
        ]
    };
    const AddingOption = {
        type: 'normal', items: [
            {
                icon: <MenuIcon name="description" />, title: 'Page tab', onClick: () => {
                    addTab({
                        id: uuid(),
                        taken: false,
                        data: {
                            use: 'thePage',
                            type: 'book',
                            book: 'Genesis',
                            bookId: 'GEN',
                            chapter: 1,
                            translation: 'BSB'
                        }
                    })
                    closePopupSettings()
                }
            },
            {
                icon: <MenuIcon name="view_in_ar" />, title: 'Create Canvas tab', onClick: () => {
                    addTab({
                        id: uuid(),
                        taken: false,
                        data: {
                            use: 'thePage',
                            type: 'canvas',
                            book: 'Genesis',
                            bookId: 'GEN',
                            chapter: 1,
                            translation: 'BSB'
                        }
                    })
                    closePopupSettings()
                }
            },
            {
                icon: <MenuIcon name="map" />, title: 'Create map tab', onClick: () => {
                    addTab({
                        id: uuid(),
                        taken: false,
                        data: {
                            use: 'thePage',
                            type: 'map',
                            book: 'Genesis',
                            bookId: 'GEN',
                            chapter: 1,
                            translation: 'BSB'
                        }
                    })
                    closePopupSettings()
                }
            },
            {
                icon: <MenuIcon name="create_new_folder" />, title: 'New folder', onClick: () => {
                    addFolder(`Folder ${folders.length + 1}`)
                    closePopupSettings()
                    // addTabToFolder(folder.id, { id: uuid(), taken: false, data: { type: 'book', book: 'Exodus', chapter: 1 } })
                }
            },
        ]
    };
    return (
        <div
            onMouseUp={() => setIsDragging(false)}
            className={collapsed ? "sidebar-collapsed" : "sidebar-1"}
        >
            <div className="headbar">
                {!collapsed ? (
                    <>
                        <div className="menuOptions">
                            <span onClick={toggleSidebar} className="material-symbols-outlined">menu_open</span>
                            <span>{currentSpace.name}</span>
                        </div>
                        <div className="canvasOptions">
                            <span onClick={() => {
                                openPopupSettings(ScreenOptions)
                            }}>
                                {screens <= 1 ? <SingleScreenIcon /> : screens === 2 ? <DualScreenIcon /> : screens === 3 ? <ThreeScreenIcon /> : screens === 4 ? <QuadScreenIcon /> : null}
                            </span>
                            <span onClick={() => {
                                openPopupSettings(MenuOptions)
                            }} className="material-symbols-outlined PageOptionsButton">more_vert</span>
                        </div>
                    </>
                ) : (
                    <div className="collapsedMenu">
                        <span onClick={toggleSidebar} className="material-symbols-outlined">menu</span>
                    </div>
                )}
            </div>

            {!collapsed && (
                <>
                    <div className="sidebarLine"></div>
                    <div className="searchSection">
                        <span className="material-symbols-outlined">search</span>
                        <input placeholder="Search..." />
                    </div>
                    <div className="tabsContainer">
                        <span>Tabs & Folders</span>
                        <span
                            onClick={
                                () => {

                                    openPopupSettings(AddingOption)

                                }
                            }
                            className="material-symbols-outlined addIcon"
                        >
                            add
                        </span>
                    </div>
                </>
            )}
            {folders.map(folder => (
                <Folder
                    folder={folder}
                    collapsed={collapsed}
                />
            ))}
            {folders.length > 0 && <div style={{ marginBottom: '10px' }} className={'sidebarLine'}></div>}
            <div style={{ 'border-raduis': '8px', border: tabEntered ? '1px black dashed' : '' }}
                onPointerEnter={handleMouseEnter}
                onPointerLeave={handleMouseLeave}
                onPointerUp={handleMouseUp}
                className={collapsed ? "tabs-collapsed" : "tabs"}>
                {tabs.map((el) => (
                    <Tab
                        key={el.id}
                        el={el}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        setIsDragging={setIsDragging}
                        setElement={setElement}
                        collapsed={collapsed}
                    />
                ))}
            </div>

            <div className={collapsed ? "profileSection-collapsed" : "profileSection"}>
                {!collapsed ? (
                    <>
                        <span onClick={() => setSideBarMode('settings')} className="material-symbols-outlined">settings</span>
                        <SettingsProfile />
                        <UserProfile />
                    </>
                ) : (
                    <>
                        <Icon icon="settings" onClick={() => setSideBarMode('settings')} />
                        <UserProfile collapsed={true} />
                    </>
                )}
            </div>
            <style>{getStyleOf('sidebar.css')}</style>
            <style>{sidebarStyles}</style>
        </div>
    );
}

const Icon = ({ icon, onClick }) => {
    return (
        <div className="icon-button" onClick={onClick}>
            <span className="material-symbols-outlined">{icon}</span>
        </div>
    );
};

const SettingsProfile = () => {
    const [iss, setIss] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const holdTimeout = useRef(null);
    const { spaces, activeSpace, setActiveSpace, addSpace, updateSpace, removeSpace } = useTabsContext();
    const { openPopupSettings } = useSideBarContext();
    const { setIsAbleToRightClick } = useMouseMove();



    const OPTIONS = (id) => {
        return {
            type: 'normal', items: [
                { icon: <MenuIcon name="add" />, title: 'Create a new space', external: <CreateNewSpaceModal addSpace={addSpace} activeSpace={id} />, onClick: () => { } },
                { type: 'line' },
                { icon: <MenuIcon name="edit" />, title: 'Rename space', external: <RenameSpaceModal updateSpace={updateSpace} activeSpace={id} />, onClick: () => { } },
                // { icon: <MenuIcon name="palette" />, title: 'Edit space',external: <CreateNewSpaceModal />, onClick: () => { } },
                { type: 'line' },
                { icon: <MenuIcon name="download" />, title: 'Import space', external: <ImportSpaceModal />, onClick: () => { } },
                { type: 'line' },
                { icon: <MenuIcon name="share" />, title: 'Share', onClick: () => { } },
                { icon: <MenuIcon name="delete" />, title: 'Delete', onClick: () => { removeSpace(id) } },
            ]
        }
    };

    const handleRightClick = (spaceId) => {
        openPopupSettings(OPTIONS(spaceId), true);
    };

    const handleMouseDown = (spaceId) => {
        setIsHolding(false);
        holdTimeout.current = setTimeout(() => {
            setIsHolding(true);
            handleRightClick(spaceId);
        }, 900); // 1.2 seconds hold
    };

    const handleMouseUp = (spaceId) => {
        clearTimeout(holdTimeout.current);
        if (!isHolding) {
            setActiveSpace(spaceId);
        }
    };

    return (
        <div className="dot">
            {spaces.map(space => {
                return (
                    <SurroundingDivs key={space.id} action={() => { setIsAbleToRightClick(false); }}>
                        <div
                            onMouseDown={() => handleMouseDown(space.id)}
                            onMouseUp={() => handleMouseUp(space.id)}
                            onMouseLeave={() => clearTimeout(holdTimeout.current)}
                            className={space.id === activeSpace ? "activeBg" : 'bg'}>
                            {!space?.icon ? <span></span> : <div style={{ cursor: 'pointer' }}>{space.icon}</div>}
                        </div>
                    </SurroundingDivs>
                );
            })}
        </div>
    );
};

const UserProfile = ({ collapsed }) => {
    return (
        <div className="userProfile">
            <span className="material-symbols-outlined">person</span>
        </div>
    );
};

const sidebarStyles = `
    .sidebar-collapsed {
        padding: 15px 8px;
        width: 60px;
        height: 100vh;
        position: relative;
        transition: width 0.3s ease;
    }

    .sidebar-1 {
        background-color: var(--primary-color);
        transition: width 0.3s ease;
        pointer-events: all;
    }

    .collapsedMenu {
        display: flex;
        justify-content: center;
        width: 100%;
        cursor: pointer;
        margin-bottom:30px;
    }

    .tabs-collapsed {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20px;
        gap: 15px;
    }

    .tabInfoCollapsed {
        display: flex;
        justify-content: center;
        padding: 8px 0;
    }

    .profileSection-collapsed {
        position: absolute;
        left: 0;
        bottom: 26px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
        align-items: center;
    }

    .icon-button {
        cursor: pointer;
        color: var(--gray-color);
    }
`;

export { SideBar };