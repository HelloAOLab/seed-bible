import { getStyleOf } from 'app.styles.styler';
import { useTabsContext } from 'app.hooks.tabs';
import { useMouseMove, useClickAndHold } from 'app.hooks.mouseMove';
import { DualScreenIcon, ThreeScreenIcon, QuadScreenIcon, SingleScreenIcon, MenuIcon, Panel1, Panel2, Panel3, Panel4, Panel3Row, Panel4Row } from 'app.components.icons'
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
    const { removeTab, multiSelectMode, setMultiSelectMode,
        selectedTabs, setSelectedTabs, } = useTabsContext()


    const OPTIONS = (tab) => ({
        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'Delete tab', onClick: () => { removeTab(el.id); closePopupSettings() } },
            { icon: <MenuIcon name="edit" />, title: 'Edit mode', onClick: () => { globalThis[`SetEnableEditorOf${activeTab}`](prev => !prev); closePopupSettings() } },
            {
                icon: <MenuIcon name="check_box" />, title: multiSelectMode ? `Deselect` : `Select`, onClick: () => {
                    setMultiSelectMode(prev => !prev);
                    setSelectedTabs([activeTab]);
                }
            },

        ]
    })
    const CANVASOPTIONS = {
        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'Delete tab', onClick: () => { removeTab(el.id); closePopupSettings() } }
        ]
    }

    const MAPOPTIONS = {
        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'Delete tab', onClick: () => { removeTab(el.id); closePopupSettings() } }
        ]
    }

    const dragTimeout = useRef(null);

    function handleMouseDown() {
        if (multiSelectMode) return;
        if (globalThis?.activeCanvasId && el.data.type === "canvas") return;

        dragTimeout.current = setTimeout(() => {
            setIsDragging(true);
            setElement({
                App: <Tab
                    el={el}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setIsDragging={setIsDragging}
                    setElement={setElement}
                    collapsed={collapsed}
                />,
                data: el
            });
        }, 300); // delay before starting drag
    }

    function handleMouseUpOrLeave() {
        clearTimeout(dragTimeout.current);
    }
    useEffect(() => {
        os.log(selectedTabs, selectedTabs.lenght === 0, 'selectedTabs')
        if (selectedTabs.length === 0)
            setMultiSelectMode(false)
    }, [selectedTabs])
    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClick={() => {
                if (!(globalThis?.activeCanvasId && el.data.type === "canvas")) {
                    setActiveTab(el.id);
                    if (globalThis[`UpdateTabWidthId${el?.id}`])
                        globalThis[`UpdateTabWidthId${el?.id}`](el)
                    globalThis.UpdateTab(el)
                    if (el.data.type === 'canvas') {
                        setMapMode(false);
                        setCanvasMode(true)
                        globalThis.CanvasMode = true;
                        window.CanvasMode = true;
                        configBot.tags.gridPortal = `${el?.data?.book}-${el?.data?.chapter}`
                        // configBot.tags.mapPortal = null;
                    } else if (el.data.type === 'map') {
                        setMapMode(true);
                        setCanvasMode(true)
                        globalThis.CanvasMode = true;
                        window.CanvasMode = true;
                        configBot.tags.miniMapPortal = `${el?.data?.book}-${el?.data?.chapter}`;
                        const geoImporter = getBot("system", "ext_geoImporter.importer");
                        if (geoImporter) {
                            setTag(geoImporter, "targetDim", `${el?.data?.book}-${el?.data?.chapter}`, "local")
                        }
                    } else {
                        setCanvasMode(false)
                        setMapMode(false);
                    }
                } else if (el.data.type === "canvas" && globalThis?.activeCanvasId) {
                    setActiveTab(el.id);
                    setTagMask(thisBot, "canvasTab", el, "tempLocal");
                    setMapMode(false);
                    setCanvasMode(true)
                    globalThis.CanvasMode = true;
                    window.CanvasMode = true;
                    configBot.tags.gridPortal = `${el?.data?.book}-${el?.data?.chapter}`
                }

            }}
            className={`${activeTab === el.id && !multiSelectMode && !collapsed
                ? 'activeTab'
                : activeTab === el.id && collapsed
                    ? 'activeTabCollapsed'
                    : collapsed
                        ? 'collabsedTab'
                        : 'tab'
                } ${selectedTabs?.includes?.(el.id) ? 'selected' : ''}`}
        >
            {!collapsed ? (
                <>
                    <div className="tabInfo">
                        {multiSelectMode && (
                            <input
                                type="checkbox"
                                className="customCheckbox"
                                checked={selectedTabs.includes(el.id)}
                                onChange={() => {
                                    setSelectedTabs(prev =>
                                        prev.includes(el.id)
                                            ? prev.filter(id => id !== el.id)
                                            : [...prev, el.id]
                                    );
                                }}
                            // style={{ marginRight: '8px' }}
                            />
                        )}
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

                    {activeTab === el.id && <span onClick={() => { openPopupSettings(OPTIONS(el)); }} style={{ display: activeTab ? '' : 'none' }} className="material-symbols-outlined ">
                        more_vert
                    </span>}
                </>
            ) : (
                <div className="tabInfoCollapsed">
                    <span className="tabIcon">

                        {el?.data?.type === 'book' && `${el.data.bookId}`}
                        {el?.data?.type === 'map' && <span className="material-symbols-outlined">map</span>}
                        {el?.data?.type === 'canvas' && <span className="material-symbols-outlined">deployed_code</span>}

                    </span>
                </div>
            )}
        </div>
    );
}

function Folder({ folder, collapsed }) {
    const {
        setActiveTab, activeTab, removeFolder, addTabToFolder, addTabsToFolder
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
            { icon: <MenuIcon name="delete" />, title: 'Delete folder', onClick: () => { removeFolder(folder.id); closePopupSettings() } },
        ]
    }
    return <div style={{ 'border-raduis': '8px', border: tabEntered ? '1px black dashed' : '' }} key={folder.id} onPointerEnter={handleMouseEnter} onPointerLeave={handleMouseLeave} onPointerUp={handleMouseUp} className="folder">
        <div onClick={() => setOpen(!open)} className="folderHeader">
            {open ? <MenuIcon name="folder_open" /> : <MenuIcon name={'folder'} />}
            {!collapsed && <span>{folder.name}</span>}
            <span style={{ position: 'absolute', right: '14px' }} onClick={() => { openPopupSettings(OPTIONS) }} className="material-symbols-outlined ">
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
        updateSpace, activeSpace, multiSelectMode, setMultiSelectMode,
        selectedTabs, setSelectedTabs,
    } = useTabsContext();
    globalThis.AddTab = addTab
    const { screens, setScreens, fullScreen, setFullScreen } = useBibleContext();
    const [customScreens, setCustomScreens] = useState({ value: 1 })
    useEffect(() => {
        setCustomScreens(globalThis.SpaceScreens[activeSpace] ? { value: globalThis.SpaceScreens[activeSpace] } : { value: 1 })
    }, [activeSpace])
    // useEffect(() => {
    //     updateSpace(activeSpace, {
    //         screens: screens
    //     });
    //     if (screens) {

    //         masks[activeSpace] = screens
    //         os.log(masks[activeSpace], activeSpace, 'masks[activeSpace]')
    //         setCustomScreens(screens)
    //     }
    // }, [screens])
    const { sidebarMode, setSideBarMode, collapsed, setCollapsed, openPopupSettings, sidebarWidth, setSidebarWidth, closePopupSettings } = useSideBarContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const [tabEntered, setTabEntered] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [openOnMobile, setOpenOnMobile] = useState(false)

    const isResizing = useRef(false);
    const sidebarRef = useRef()

    const handleMouseDown = (e) => {
        // if (e.clientX >= sidebarWidth - 5 && e.clientX <= sidebarWidth + 5) {
        isResizing.current = true;
        // }
    };

    const handleMouseMove = (e) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(40, Math.min(e.clientX, 300)); //min 150 max 300
        if (newWidth <= 140) {
            setCollapsed(true)
        } else {
            setCollapsed(false)
        }
        if (newWidth < 55) {
            setSidebarWidth(0)
            // sidebarRef.current.styles.display = "none"
            return
        }
        setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
        if (isResizing.current) {
            isResizing.current = false;
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
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
    function handleMouseUpTab() {
        if (!isDragging)
            return
        moveTab(Element.data.id);
        setTabEntered(false)
    }
    useEffect(() => {
        if (isMobile) {

            setOpenOnMobile(false)
            setIsMobile(true)
        }
    }, [customScreens])
    // Function to toggle sidebar collapse state
    const toggleSidebar = () => {
        if (isMobile)
            setOpenOnMobile(false)

        else
            setCollapsed(!collapsed);
    };
    const ScreenOptions = ({ setCustomScreens }) => {

        return <div
            style={{
                width: "370px",
                height: "100%",
                " flex-shrink": "0",
                "border-radius": "10px",
                background: " #202020",
                padding: "20px",
            }}
        >
            <div
                style={{
                    color: "white",
                    textAlign: "left",
                    marginBottom: "10px",
                    color: " #FFF",
                    "font-family": "Satoshi",
                    "font-size": "16px",
                    "font-style": "normal",
                    "font-weight": "700",
                    "line-height": "normal",
                }}
            >
                Panels
            </div>
            <div
                style={{
                    gap: "10px",
                    display: "grid",
                    "grid-template-columns": "repeat(3, 1fr)",
                }}
            >
                <div onClick={() => { setCustomScreens({ value: 1 }); setScreens({ value: 1 }) }} style={{ cursor: "pointer" }}>
                    <Panel1 />
                </div>
                <div onClick={() => { setCustomScreens({ value: 2 }); setScreens({ value: 2 }) }} style={{ cursor: "pointer" }}>
                    <Panel2 />
                </div>
                {!isMobile && <>  <div onClick={() => { setCustomScreens({ value: 3 }); setScreens({ value: 3 }) }} style={{ cursor: "pointer" }}>
                    <Panel3 />
                </div>
                    <div onClick={() => { setCustomScreens({ value: 3, row: true }); setScreens({ value: 3, row: true }) }} style={{ cursor: "pointer" }}>
                        <Panel3Row />
                    </div>
                    <div onClick={() => { setCustomScreens({ value: 4 }); setScreens({ value: 4 }) }} style={{ cursor: "pointer" }}>
                        <Panel4 />
                    </div>
                    <div onClick={() => { setCustomScreens({ value: 4, row: true }); setScreens({ value: 4, row: true }) }} style={{ cursor: "pointer" }}>
                        <Panel4Row />
                    </div></>}
            </div>
        </div>
        // type: 'normal', items: [
        //     { icon: <SingleScreenIcon />, title: '1 Panel', onClick: () => { setCustomScreens({ value: 1 }); setScreens({ value: 1 }) } },
        //     { icon: <DualScreenIcon />, title: '2 Panels', onClick: () => { setCustomScreens({ value: 2 }); setScreens({ value: 2 }) } },
        //     { icon: <ThreeScreenIcon />, title: '3 Panels', onClick: () => { setCustomScreens({ value: 3 }); setScreens({ value: 3 }) } },
        //     { icon: <QuadScreenIcon />, title: '4 Panels', onClick: () => { setCustomScreens({ value: 4 }); setScreens({ value: 4 }) } },
        // ]
    }
    const MenuOptions = {
        type: 'normal', items: [
            { disabled: true, icon: <MenuIcon name="logout" />, title: 'Join a Lobby', onClick: () => { } },
            { type: 'line' },
            { disabled: false, icon: <MenuIcon name="fullscreen" />, title: 'Full screen', onClick: () => { setFullScreen(true) } },
            { type: 'line' },
            { disabled: true, icon: <MenuIcon name="search" />, title: 'Search', onClick: () => { } },
            { disabled: true, icon: <MenuIcon name="extension" />, title: 'Extensions', onClick: () => { } },
            { type: 'line' },
            { disabled: true, icon: <MenuIcon name="bug_report" />, title: 'Report a bug', onClick: () => { } },
            { disabled: true, icon: <MenuIcon name="help" />, title: 'Help', onClick: () => { } },
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
                icon: <MenuIcon name="view_in_ar" />, title: 'Canvas tab', onClick: () => {
                    let canvasNumber = globalThis?.initiatedCanvas ? globalThis.initiatedCanvas + 1 : 1;
                    globalThis.initiatedCanvas = canvasNumber;
                    addTab({
                        id: uuid(),
                        taken: false,
                        data: {
                            use: 'thePage',
                            type: 'canvas',
                            book: 'Canvas',
                            bookId: 'GEN',
                            chapter: canvasNumber,
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
    useEffect(() => {
        os.log(customScreens, 'customScreens')
    }, [customScreens])
    const {
        moveMultipleTabs
    } = useTabsContext();
    return (
        <>
            {isResizing.current &&
                <style>
                    {
                        `
                      *{
                        user-select:none;
                        }
                    `
                    }
                </style>
            }
            {fullScreen && <div onClick={() => setFullScreen(false)} style={{ position: 'absolute', left: '10px', top: '20px', zIndex: 99999 }}>
                <span className="material-symbols-outlined">menu</span>
            </div>}
            {isMobile && !openOnMobile &&
                <div onClick={() => { setSidebarWidth(300); setOpenOnMobile(true) }} style={{ position: 'absolute', left: '10px', top: '40px', zIndex: 99999 }}>
                    <span className="material-symbols-outlined">menu</span>
                </div>}
            {sidebarWidth === 0 && <div
                onMouseDown={() => {
                    setSidebarWidth(300)
                    setCollapsed(false)
                    // handleMouseDown()
                }}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '12px',
                    height: '100vh',
                    backgroundColor: 'var(--primary-color)',
                    borderTopRightRadius: '50%',
                    borderBottomRightRadius: '50%',
                    opacity: 0,
                    transition: 'opacity 0.3s ease-in-out',
                    cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0'}
            >
            </div>
            }
            <div
                onMouseUp={() => setIsDragging(false)}
                style={{ width: `${sidebarWidth}px`, display: sidebarWidth === 0 ? "none" : null }}
                // onMouseDown={handleMouseDown}
                ref={sidebarRef}
                className={collapsed ? "sidebar-collapsed" : `sidebar-1 ${openOnMobile ? 'open' : null} ${fullScreen ? 'floatSidebar' : null}`}
            >
                <div onMouseDown={handleMouseDown} style={{ position: "absolute", right: '0', top: '0', width: '10px', height: '100%', background: "", cursor: 'pointer' }}></div>

                <div className="headbar">
                    {!collapsed ? (
                        <>
                            <div className="menuOptions">
                                <span onClick={() => {
                                    let mob = window.innerWidth < 768
                                    if (!mob) {

                                        setSidebarWidth(60);
                                        setCollapsed(true);
                                        setMultiSelectMode(false)
                                    } else {
                                        setMultiSelectMode(false)
                                        setSidebarWidth(0)
                                        setOpenOnMobile(false)
                                    }
                                }} className="material-symbols-outlined">menu_open</span>
                                <span>{currentSpace.name}</span>
                            </div>
                            <div className="canvasOptions">
                                <span onClick={() => {
                                    openPopupSettings(<ScreenOptions setCustomScreens={setCustomScreens} />, null, true)
                                }}>
                                    {customScreens?.value
                                        <= 1 ? <SingleScreenIcon /> : customScreens?.value
                                            === 2 ? <DualScreenIcon /> : customScreens?.value
                                                === 3 ? <ThreeScreenIcon /> : customScreens?.value
                                                    === 4 ? <QuadScreenIcon /> : null}
                                </span>
                                <span onClick={() => {
                                    openPopupSettings(MenuOptions)
                                }} className="material-symbols-outlined PageOptionsButton">more_vert</span>
                            </div>
                        </>
                    ) : null}
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
                {multiSelectMode && (
                    <div className="multiSelectActions">
                        <label
                            style={{
                                display: "flex",
                                "justify-content": "center",
                                "align-items": "center",
                                gap: "6px",
                            }}
                        >
                            <input
                                type="checkbox"
                                className="customCheckbox"
                                checked={selectedTabs.length === tabs.length}
                                onChange={(e) =>
                                    setSelectedTabs(e.target.checked ? tabs.map(t => t.id) : [])
                                }
                            />
                            Select All
                        </label>
                        <div style={{ background: '#bbc2c2', height: '20px', width: '2px' }}></div>
                        <div
                            style={{
                                display: "flex",
                                "justify-content": "center",
                                "align-items": "center",
                                gap: "6px",
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                selectedTabs.forEach(id => removeTab(id));
                                setSelectedTabs([]);
                                setMultiSelectMode(false);
                            }}>
                            <span style={{ 'font-size': '19px' }} class="material-symbols-outlined">
                                delete
                            </span>
                            <span>
                                Delete All
                            </span>
                        </div>
                        <div style={{ background: '#bbc2c2', height: '20px', width: '2px' }}></div>
                        <div
                            style={{
                                display: "flex",
                                "justify-content": "center",
                                "align-items": "center",
                                gap: "6px",
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                if (folders.length === 0) {
                                    os.toast("You don't have any folders")
                                    return
                                }
                                const OPTIONS = { type: 'normal', items: [] }
                                folders.forEach((item) => {
                                    OPTIONS.items.push({
                                        icon: <MenuIcon name="folder" />, title: `Add to ${item.name}`, onClick: () => {
                                            console.log(tabs.map(e => selectedTabs.includes(e.id)))
                                            moveMultipleTabs(selectedTabs, item.id)
                                            setMultiSelectMode(false)
                                        }
                                    })
                                })
                                openPopupSettings(OPTIONS)
                            }}>
                            <span style={{ 'font-size': '19px' }} class="material-symbols-outlined">
                                create_new_folder
                            </span>
                        </div>
                    </div>
                )}
                {collapsed && <div style={{
                    display: 'flex', 'align-items': 'center', 'justify-content': 'center', width: '100%', "flex-direction": "column",
                    gap: "12px",
                    "padding-top": "10px"
                }}>
                    <span onclick={() => { setSidebarWidth(280); setCollapsed(false) }} class="material-symbols-outlined">
                        menu
                    </span>
                    <div style={{
                        height: '1px',
                        width: '90%',
                        background: "rgb(187, 194, 194)",

                    }}></div>
                </div>}
                <div style={{ 'border-raduis': '8px', border: tabEntered ? '1px black dashed' : '' }}
                    onPointerEnter={handleMouseEnter}
                    onPointerLeave={handleMouseLeave}
                    onPointerUp={handleMouseUpTab}
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

                    {collapsed && <span onClick={
                        () => {

                            openPopupSettings(AddingOption)

                        }
                    } class="material-symbols-outlined addIconCollapsed">
                        add
                    </span>}
                </div>

                <style>{getStyleOf('sidebar.css')}</style>
                <style>{sidebarStyles}</style>
            </div>
        </>
    );
}
export const SpaceUI = () => {
    const { setSideBarMode, collapsed, sidebarWidth } = useSideBarContext();
    const { screens, fullScreen, setFullScreen } = useBibleContext()
    const [globalProfilePic, setGlobalProfilePic] = useState()
    globalThis.SetGlobalProfilePic = setGlobalProfilePic
    if (sidebarWidth !== 0)
        return <div style={{ width: sidebarWidth }} className={collapsed ? "profileSection-collapsed" : `profileSection ${fullScreen ? 'floatProfileSection' : null}`}>
            {!collapsed ? (
                <>
                    <span style={{ cursor: 'pointer' }} onClick={() => setSideBarMode('settings')} className="material-symbols-outlined">settings</span>
                    <SettingsProfile />
                    <UserProfile />
                </>
            ) : (
                <>
                    <Icon icon="settings" onClick={() => setSideBarMode('settings')} />
                    <UserProfile collapsed={true} />
                </>
            )}
            <style>{getStyleOf('sidebar.css')}</style>
        </div>
}
const Icon = ({ icon, onClick }) => {
    return (
        <div className="icon-button" onClick={onClick}>
            <span className="material-symbols-outlined">{icon}</span>
        </div>
    );
};

export const SettingsProfile = () => {
    const [iss, setIss] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const holdTimeout = useRef(null);
    const { spaces, activeSpace, setActiveSpace, addSpace, updateSpace, removeSpace } = useTabsContext();
    const { openPopupSettings } = useSideBarContext();
    const { setIsAbleToRightClick } = useMouseMove();

    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext();

    const OPTIONS = (id) => {
        return {
            type: 'normal', items: [
                { icon: <MenuIcon name="add" />, title: 'Create a new space', external: <CreateNewSpaceModal addSpace={addSpace} activeSpace={id} />, onClick: () => { } },
                { type: 'line' },
                { icon: <MenuIcon name="edit" />, title: 'Edit space', onClick: () => { setSideBarMode('settings') } },
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
        // setIsHolding(false);
        // holdTimeout.current = setTimeout(() => {
        //     setIsHolding(true);
        //     handleRightClick(spaceId);
        // }, 900); 
        // 1.2 seconds hold
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
                            onContextMenu={() => handleRightClick(space.id)}
                            className={space.id === activeSpace ? "activeBg" : 'bg'}>
                            {!space?.icon ? <span></span> : <div className="material-symbols-outlined" style={{ scale: "0.6", cursor: 'pointer' }} >{space.icon}</div>}
                        </div>
                    </SurroundingDivs>
                );
            })}
        </div>
    );
};

export const UserProfile = ({ collapsed }) => {
    const { setSideBarMode } = useSideBarContext();
    const [userData, setUserData] = useState(null)
    const getUserData = async () => {
        if (!authBot?.id)
            return

        const data = await os.getData(tags.key, authBot.id);
        if (data.success) {
            const payload = data.data
            setUserData(payload)
            globalThis.SetGlobalProfilePic(payload?.photoLink)
        }
    }
    useEffect(() => {
        getUserData()
    }, [])
    return (
        <div onClick={() => { globalThis.AccountSettingsEnteredFrom = 'default'; setSideBarMode('createAccountSettings') }} style={{ background: userData?.photoLink && 'transparent' }} className="userProfile">
            {userData?.photoLink ? <img style={{ 'border-radius': '50%', width: '35px', border: '' }} src={userData?.photoLink} /> : <span className="material-symbols-outlined">person</span>}
        </div>
    );
};

const sidebarStyles = `
    .sidebar-collapsed {
        padding: 15px 8px;
        width: 60px;
        height: 100vh;
        position: relative;
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
        color: var(--themeText1);
    }
`;

export { SideBar };