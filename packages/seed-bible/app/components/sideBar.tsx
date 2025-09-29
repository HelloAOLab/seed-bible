import { getStyleOf } from 'app.styles.styler';
import { useTabsContext } from 'app.hooks.tabs';
import { useMouseMove, useClickAndHold } from 'app.hooks.mouseMove';
import { DualScreenIcon, ThreeScreenIcon, QuadScreenIcon, SingleScreenIcon, MenuIcon, Panel1, Panel2, Panel3, Panel4, Panel3Row, Panel4Row } from 'app.components.icons'
import { useBibleContext } from 'app.hooks.bibleVariables'
import { useSideBarContext } from 'app.hooks.sideBar'
import SurroundingDivs from 'app.components.surroundingDivs'
import { TabOptions } from 'app.components.types'
import { FolderIcon, OpenFolderIcon } from 'app.components.icons'
import {
    ImportSpaceModal, RenameSpaceModal,
    CreateNewSpaceModal
} from 'app.components.spaceSettings'
import { AOLabUpdateCard } from 'app.components.notifications'
const { useState, useRef, useEffect } = os.appHooks;
function Tab({ el, activeTab, setActiveTab, setIsDragging, setElement, collapsed }) {
    const { openPopupSettings, closePopupSettings, userURL } = useSideBarContext();
    const { setCanvasMode, setMapMode } = useBibleContext();
    const { removeTab, multiSelectMode, setMultiSelectMode,
        selectedTabs, setSelectedTabs, } = useTabsContext()


    const OPTIONS = (tab) => ({
        type: 'normal', items: [
            { icon: <MenuIcon name="delete" />, title: 'Delete tab', onClick: () => { removeTab(el.id); closePopupSettings() }, active: TabOptions.Delete.active },
            { icon: <MenuIcon name="edit" />, title: 'Edit mode', onClick: () => { globalThis[`SetEnableEditorOf${activeTab}`](prev => !prev); closePopupSettings() }, active: TabOptions.Edit.active },
            {
                icon: <MenuIcon name="check_box" />, title: multiSelectMode ? `Deselect` : `Select`, onClick: () => {
                    setMultiSelectMode(prev => !prev);
                    setSelectedTabs([activeTab]);
                },
                active: TabOptions.Select.active
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
                    if (globalThis.ChangeGlobalHighlighting) globalThis.ChangeGlobalHighlighting(true);
                    if (globalThis.RemoveStudyNoteBackButton) globalThis.RemoveStudyNoteBackButton();
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
        tabs, folders, addTab, removeTab, setActiveTab, activeTab, updateTab, updateActiveTab,
        addFolder, removeFolder, addTabToFolder, moveTab, currentSpace,
        updateSpace, activeSpace, multiSelectMode, setMultiSelectMode,
        selectedTabs, setSelectedTabs, getAllTabsInSpace
    } = useTabsContext();
    globalThis.AddTab = addTab;
    globalThis.RemoveTab = removeTab;


    // additions

    globalThis.SetActiveTab = setActiveTab;
    globalThis.ActiveTab = activeTab;

    const getTabsInSpace = () => {
        console.log("getAllTabsInSpace: ", getAllTabsInSpace(activeSpace));
        return getAllTabsInSpace(activeSpace);
    }

    globalThis.GetTabsInSpace = getTabsInSpace;

    globalThis.UpdateTab = updateActiveTab;

    // end of additions

    const { screens, setScreens, fullScreen, setFullScreen, ReSeed, setReSeed } = useBibleContext();
    const [customScreens, setCustomScreens] = useState({ value: 1 })
    const [showSearch, setShowSearch] = useState(true); // New state for search visibility
    const [editMode, setEditMode] = useState(false); // New state for edit mode
    useEffect(() => {
        setEditMode(ReSeed)
    }, [ReSeed])
    useEffect(() => {
        setCustomScreens(globalThis.SpaceScreens[activeSpace] ? { value: globalThis.SpaceScreens[activeSpace] } : { value: 1 })
    }, [activeSpace])

    // Initialize globalThis.changes if it doesn't exist
    useEffect(() => {
        if (!globalThis.changes) {
            globalThis.changes = {};
        }
        // Load saved search visibility state
        if (globalThis.changes.showSearch !== undefined) {
            setShowSearch(globalThis.changes.showSearch);
        }
        // Load saved edit mode state
        if (globalThis.changes.editMode !== undefined) {
            setEditMode(globalThis.changes.editMode);
        }
    }, []);

    // Save search visibility changes to globalThis.changes
    useEffect(() => {
        if (!globalThis.changes) {
            globalThis.changes = {};
        }
        globalThis.changes.showSearch = showSearch;
    }, [showSearch]);

    // Save edit mode changes to globalThis.changes
    useEffect(() => {
        if (!globalThis.changes) {
            globalThis.changes = {};
        }
        globalThis.changes.editMode = editMode;
    }, [editMode]);

    const { sidebarMode, setSideBarMode, collapsed, setCollapsed, openPopupSettings, sidebarWidth, setSidebarWidth, closePopupSettings, userURL } = useSideBarContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const [tabEntered, setTabEntered] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [openOnMobile, setOpenOnMobile] = useState(false)

    const isResizing = useRef(false);
    const sidebarRef = useRef()

    const handleMouseDown = (e) => {
        isResizing.current = true;
    };

    const handleMouseMove = (e) => {
        if (!isResizing.current) return;
        const newWidth = Math.max(40, Math.min(e.clientX, 300));
        if (newWidth <= 140) {
            setCollapsed(true)
        } else {
            setCollapsed(false)
        }
        if (newWidth < 55) {
            setSidebarWidth(0)
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

    const toggleSidebar = () => {
        if (isMobile)
            setOpenOnMobile(false)
        else
            setCollapsed(!collapsed);
    };

    // Toggle search visibility function
    const toggleSearchVisibility = () => {
        setShowSearch(!showSearch);
    };

    // Toggle edit mode function
    const toggleEditMode = () => {
        // setEditMode(!editMode);
        setReSeed(prev => !prev)
        // Exit multi-select mode when entering/exiting edit mode
        if (multiSelectMode) {
            setMultiSelectMode(false);
            setSelectedTabs([]);
        }
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
    }

    const MenuOptions = {
        type: 'normal', items: [
            { disabled: true, icon: <MenuIcon name="logout" />, title: 'Join a Lobby', onClick: () => { } },
            { type: 'line' },
            { disabled: false, icon: <MenuIcon name="fullscreen" />, title: 'Full screen', onClick: () => { setFullScreen(true) } },
            { type: 'line' },
            {
                disabled: false,
                icon: <MenuIcon name={showSearch ? "visibility_off" : "visibility"} />,
                title: showSearch ? 'Hide Search' : 'Show Search',
                onClick: toggleSearchVisibility
            },
            // {
            //     disabled: false,
            //     icon: <MenuIcon name={editMode ? "edit_off" : "edit"} />,
            //     title: editMode ? 'Exit ReSeed Mode' : 'Enter ReSeed Mode',
            //     onClick: toggleEditMode
            // },
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
                    if (globalThis.ChangeGlobalHighlighting) globalThis.ChangeGlobalHighlighting(true);
                    if (globalThis.RemoveStudyNoteBackButton) globalThis.RemoveStudyNoteBackButton();
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
    const holdTimeout = useRef({ time: null, clicked: null });

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
                                }} style={{ "margin-right": "8px" }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 18V16H16V18H3ZM19.6 17L14.6 12L19.6 7L21 8.4L17.4 12L21 15.6L19.6 17ZM3 13V11H13V13H3ZM3 8V6H16V8H3Z" fill="#5F5E5C" />
                                    </svg>
                                </span>
                                <svg width="29" height="26" viewBox="0 0 29 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_176_323)">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M23.6513 8.6502C20.8462 4.55342 17.4861 1.1848 14.5831 0.102513L14.2999 0L14.0153 0.102513C11.1136 1.1848 7.75349 4.55342 4.94844 8.6502C2.17127 12.7557 0.0151859 17.5617 0 21.674C0.00433883 22.5491 0.514461 23.2393 1.13181 23.7425C3.00247 25.2321 6.45153 25.9739 9.19646 26C9.75927 26 10.292 25.9649 10.7817 25.886C12.4887 25.599 13.8161 25.1737 14.2999 25.1954C14.7846 25.1737 16.111 25.599 17.8159 25.886C18.3058 25.9649 18.8389 26 19.4032 26C21.2274 25.9988 23.3776 25.6337 25.1553 24.982C26.0451 24.6524 26.84 24.2551 27.4682 23.7425C28.0843 23.2393 28.5941 22.5491 28.6 21.674C28.5845 17.5617 26.4278 12.7557 23.6513 8.6502ZM14.4942 7.89658C14.3742 7.89037 14.2143 7.67198 14.2143 7.67198C14.2143 7.67198 14.258 7.0858 14.307 6.45022C14.3798 5.50058 14.2918 4.18593 14.3761 4.27198C14.615 4.51832 14.8977 5.98487 14.8707 6.40642C14.8428 6.82858 14.7229 7.88074 14.4942 7.89658ZM26.4089 22.4447C25.1813 23.4984 21.7946 24.3505 19.4032 24.325C18.9105 24.325 18.4583 24.2921 18.0861 24.2321C17.7973 24.1858 17.5279 24.1349 17.2664 24.0793C16.9856 24.01 16.1888 23.8413 15.7193 23.1666C15.4106 22.7236 15.0976 21.3562 15.8026 20.8011C16.9376 19.9055 18.0539 20.9728 19.4407 20.8163C22.7674 20.4435 22.7215 18.388 25.0719 17.0593C20.6184 15.886 16.9382 17.3616 16.1067 19.013C15.3911 20.4292 15.0182 19.8474 15.0266 19.3708C15.0266 19.3708 15.0244 18.7878 15.0244 18.2559C15.0244 17.7667 15.0384 16.7959 15.8553 16.2318C16.7076 15.6397 16.9152 16.0715 18.6762 15.932C21.2113 15.7295 21.5507 13.4692 23.0107 12.5233C21.5658 12.6156 17.6284 10.9471 15.6997 15.0377C15.5739 15.3058 15.1376 15.6208 14.9832 15.9137C14.9749 14.3437 14.9116 13.8656 14.9814 13.2223C15.0232 12.825 15.3027 11.8275 15.7871 11.7408C16.1696 11.674 17.0073 11.6085 17.4536 11.5115C18.6393 11.2494 20.0358 9.89806 19.9648 8.0227C18.9195 8.45294 16.2877 7.64123 15.2138 10.7968C15.109 11.0229 14.9395 11.5072 14.8481 11.77C14.893 11.3562 14.6612 9.30287 14.7805 8.48742C14.8809 8.38367 16.6103 6.97863 15.4221 4.82772C14.9153 3.91288 14.2912 2.81817 14.2912 2.81817C14.2912 2.81817 13.6673 3.91288 13.1618 4.82772C11.9724 6.97863 13.7119 8.39454 13.8136 8.49706C13.8136 8.49706 13.8003 11.0698 13.7677 11.2742C13.6552 12.0101 13.3162 10.1239 12.8209 9.49329C12.229 8.73501 11.6268 8.31999 10.4857 8.17678C9.81195 8.09322 9.73819 8.19014 8.59243 8.0227C9.85627 12.1546 11.8701 11.4143 12.9712 11.6619C13.4432 11.7675 13.6744 13.2291 13.6744 13.2291C13.7085 12.9669 13.6636 15.7111 13.68 15.7208C12.8209 15.2259 11.8611 12.1049 9.29749 12.2819C7.38066 12.413 5.89864 12.2673 5.78676 12.2043C7.08159 14.4782 7.99429 16.4573 12.1751 15.8749C13.0001 15.759 13.522 17.0805 13.5328 17.3591C13.5328 17.3591 13.5932 18.5585 13.5003 19.4159C13.4135 20.2366 12.9136 19.5383 12.4035 19.0105C11.8937 18.4821 9.97187 16.4673 6.68149 16.955C4.84926 17.2268 5.08759 17.1441 3.52964 16.9295C4.23532 17.8602 6.29812 22.0151 10.1191 20.4187C12.2823 19.5153 13.8003 20.9315 12.97 23.0107C12.8011 23.4347 12.2225 23.8426 11.2955 24.0877C11.0457 24.1392 10.7891 24.1883 10.5136 24.2321C10.1402 24.2921 9.68675 24.325 9.19646 24.325C7.59729 24.3266 5.56703 23.9827 4.02055 23.4092C3.24699 23.1272 2.59493 22.7808 2.1908 22.4465C1.77427 22.1005 1.66704 21.8355 1.67125 21.674C1.65619 18.1587 3.6598 13.5059 6.32973 9.59239C8.86175 5.83483 12.0657 2.73025 14.2999 1.78931C16.534 2.73025 19.738 5.83483 22.2687 9.59239C24.9399 13.5059 26.9423 18.1587 26.9273 21.674C26.9324 21.8349 26.8254 22.0989 26.4089 22.4447ZM17.2372 19.081C17.2397 19.0792 18.4146 17.237 21.8782 17.279C22.0809 17.2808 22.5399 17.3287 22.7547 17.3517C22.7547 17.3517 22.8043 17.4138 22.5681 17.438C21.5373 17.5756 19.1689 18.5476 18.6198 18.7983C18.229 18.9692 17.5025 19.3019 17.2543 19.3053C17.2035 19.3053 17.1839 19.2168 17.2372 19.081ZM20.9937 13.0452C20.84 13.2769 18.2748 13.7258 16.5861 15.0051C16.5861 15.0051 16.4522 14.9218 16.4866 14.8435C17.6144 12.7429 20.3466 13.021 20.9937 13.0452ZM15.9427 10.7688C16.2942 9.50572 17.7808 8.93662 18.8674 8.82043L19.0695 8.79869C18.7809 9.33455 17.0631 9.80518 16.0503 10.9058C16.0503 10.9058 15.9154 10.8663 15.9427 10.7688ZM12.6514 10.5678C12.6514 10.6843 12.5064 10.6619 12.5064 10.6619C12.5064 10.6619 11.1322 9.59767 9.79212 8.73004C9.72673 8.70363 9.73199 8.6502 9.73199 8.6502C11.3476 8.80894 12.5197 9.75299 12.6514 10.5678ZM12.2126 14.7944C12.2126 14.8581 12.0951 14.8752 12.0951 14.8752C11.9662 14.8665 10.9094 14.2955 10.0537 13.8808C9.00214 13.3704 7.81206 13.0657 7.81206 13.0657C9.97838 12.825 11.3163 13.408 12.0778 14.522C12.1599 14.6447 12.203 14.7028 12.2126 14.7944ZM5.86796 17.8524C5.87694 17.7831 7.16217 17.5921 7.63479 17.5921C10.1578 17.5921 11.4015 19.0105 11.4263 19.1161C11.4257 19.1792 11.3309 19.2109 11.3209 19.2109C11.0268 19.2034 8.09192 18.027 5.94606 17.9027C5.94606 17.9027 5.86982 17.8742 5.86796 17.8524Z" fill="#100B00" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_176_323">
                                            <rect width="28.6" height="26" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>

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
                        {showSearch && (
                            <div className="searchSection">
                                <span className="material-symbols-outlined">search</span>
                                <input placeholder="Search..." />
                            </div>
                        )}
                        <div className="tabsContainer">
                            <span>Tabs & Folders</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {editMode && (
                                    <span
                                        onClick={() => setMultiSelectMode(!multiSelectMode)}
                                        className="material-symbols-outlined addIcon"
                                        style={{
                                            fontSize: '18px',
                                            color: multiSelectMode ? '#4CAF50' : 'inherit',
                                            background: multiSelectMode ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                                            borderRadius: '4px',
                                            padding: '2px'
                                        }}
                                        title={multiSelectMode ? 'Exit Multi-Select' : 'Multi-Select Mode'}
                                    >
                                        {multiSelectMode ? 'check_box' : 'library_add_check'}
                                    </span>
                                )}
                                <span
                                    style={{ 'user-select': 'none' }}
                                    onMouseDown={() => {
                                        clearTimeout(holdTimeout.current.time);
                                        holdTimeout.current.clicked = false;
                                        holdTimeout.current.time = setTimeout(() => {
                                            holdTimeout.current.clicked = true;
                                            openPopupSettings(AddingOption, true);
                                        }, 600);
                                    }}
                                    onMouseUp={() => {
                                        clearTimeout(holdTimeout.current.time);
                                        if (!holdTimeout.current.clicked) {
                                            if (globalThis.ChangeGlobalHighlighting) globalThis.ChangeGlobalHighlighting(true);
                                            if (globalThis.RemoveStudyNoteBackButton) globalThis.RemoveStudyNoteBackButton();
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
                                            });
                                        }
                                        holdTimeout.current.clicked = false;
                                    }}
                                    onMouseLeave={() => {
                                        clearTimeout(holdTimeout.current.time);
                                        holdTimeout.current.clicked = false;
                                    }}
                                    className="material-symbols-outlined addIcon"
                                >
                                    add
                                </span>
                            </div>
                        </div>
                    </>
                )}
                {folders.map(folder => (
                    <Folder
                        folder={folder}
                        collapsed={collapsed}
                        editMode={editMode}
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
                {collapsed &&
                    <div style={{
                        display: 'flex', 'align-items': 'center', 'justify-content': 'center', width: '100%', "flex-direction": "column",
                        gap: "12px",
                        "padding-top": "10px"
                    }}>
                        <svg width="29" height="26" viewBox="0 0 29 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_176_323)">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M23.6513 8.6502C20.8462 4.55342 17.4861 1.1848 14.5831 0.102513L14.2999 0L14.0153 0.102513C11.1136 1.1848 7.75349 4.55342 4.94844 8.6502C2.17127 12.7557 0.0151859 17.5617 0 21.674C0.00433883 22.5491 0.514461 23.2393 1.13181 23.7425C3.00247 25.2321 6.45153 25.9739 9.19646 26C9.75927 26 10.292 25.9649 10.7817 25.886C12.4887 25.599 13.8161 25.1737 14.2999 25.1954C14.7846 25.1737 16.111 25.599 17.8159 25.886C18.3058 25.9649 18.8389 26 19.4032 26C21.2274 25.9988 23.3776 25.6337 25.1553 24.982C26.0451 24.6524 26.84 24.2551 27.4682 23.7425C28.0843 23.2393 28.5941 22.5491 28.6 21.674C28.5845 17.5617 26.4278 12.7557 23.6513 8.6502ZM14.4942 7.89658C14.3742 7.89037 14.2143 7.67198 14.2143 7.67198C14.2143 7.67198 14.258 7.0858 14.307 6.45022C14.3798 5.50058 14.2918 4.18593 14.3761 4.27198C14.615 4.51832 14.8977 5.98487 14.8707 6.40642C14.8428 6.82858 14.7229 7.88074 14.4942 7.89658ZM26.4089 22.4447C25.1813 23.4984 21.7946 24.3505 19.4032 24.325C18.9105 24.325 18.4583 24.2921 18.0861 24.2321C17.7973 24.1858 17.5279 24.1349 17.2664 24.0793C16.9856 24.01 16.1888 23.8413 15.7193 23.1666C15.4106 22.7236 15.0976 21.3562 15.8026 20.8011C16.9376 19.9055 18.0539 20.9728 19.4407 20.8163C22.7674 20.4435 22.7215 18.388 25.0719 17.0593C20.6184 15.886 16.9382 17.3616 16.1067 19.013C15.3911 20.4292 15.0182 19.8474 15.0266 19.3708C15.0266 19.3708 15.0244 18.7878 15.0244 18.2559C15.0244 17.7667 15.0384 16.7959 15.8553 16.2318C16.7076 15.6397 16.9152 16.0715 18.6762 15.932C21.2113 15.7295 21.5507 13.4692 23.0107 12.5233C21.5658 12.6156 17.6284 10.9471 15.6997 15.0377C15.5739 15.3058 15.1376 15.6208 14.9832 15.9137C14.9749 14.3437 14.9116 13.8656 14.9814 13.2223C15.0232 12.825 15.3027 11.8275 15.7871 11.7408C16.1696 11.674 17.0073 11.6085 17.4536 11.5115C18.6393 11.2494 20.0358 9.89806 19.9648 8.0227C18.9195 8.45294 16.2877 7.64123 15.2138 10.7968C15.109 11.0229 14.9395 11.5072 14.8481 11.77C14.893 11.3562 14.6612 9.30287 14.7805 8.48742C14.8809 8.38367 16.6103 6.97863 15.4221 4.82772C14.9153 3.91288 14.2912 2.81817 14.2912 2.81817C14.2912 2.81817 13.6673 3.91288 13.1618 4.82772C11.9724 6.97863 13.7119 8.39454 13.8136 8.49706C13.8136 8.49706 13.8003 11.0698 13.7677 11.2742C13.6552 12.0101 13.3162 10.1239 12.8209 9.49329C12.229 8.73501 11.6268 8.31999 10.4857 8.17678C9.81195 8.09322 9.73819 8.19014 8.59243 8.0227C9.85627 12.1546 11.8701 11.4143 12.9712 11.6619C13.4432 11.7675 13.6744 13.2291 13.6744 13.2291C13.7085 12.9669 13.6636 15.7111 13.68 15.7208C12.8209 15.2259 11.8611 12.1049 9.29749 12.2819C7.38066 12.413 5.89864 12.2673 5.78676 12.2043C7.08159 14.4782 7.99429 16.4573 12.1751 15.8749C13.0001 15.759 13.522 17.0805 13.5328 17.3591C13.5328 17.3591 13.5932 18.5585 13.5003 19.4159C13.4135 20.2366 12.9136 19.5383 12.4035 19.0105C11.8937 18.4821 9.97187 16.4673 6.68149 16.955C4.84926 17.2268 5.08759 17.1441 3.52964 16.9295C4.23532 17.8602 6.29812 22.0151 10.1191 20.4187C12.2823 19.5153 13.8003 20.9315 12.97 23.0107C12.8011 23.4347 12.2225 23.8426 11.2955 24.0877C11.0457 24.1392 10.7891 24.1883 10.5136 24.2321C10.1402 24.2921 9.68675 24.325 9.19646 24.325C7.59729 24.3266 5.56703 23.9827 4.02055 23.4092C3.24699 23.1272 2.59493 22.7808 2.1908 22.4465C1.77427 22.1005 1.66704 21.8355 1.67125 21.674C1.65619 18.1587 3.6598 13.5059 6.32973 9.59239C8.86175 5.83483 12.0657 2.73025 14.2999 1.78931C16.534 2.73025 19.738 5.83483 22.2687 9.59239C24.9399 13.5059 26.9423 18.1587 26.9273 21.674C26.9324 21.8349 26.8254 22.0989 26.4089 22.4447ZM17.2372 19.081C17.2397 19.0792 18.4146 17.237 21.8782 17.279C22.0809 17.2808 22.5399 17.3287 22.7547 17.3517C22.7547 17.3517 22.8043 17.4138 22.5681 17.438C21.5373 17.5756 19.1689 18.5476 18.6198 18.7983C18.229 18.9692 17.5025 19.3019 17.2543 19.3053C17.2035 19.3053 17.1839 19.2168 17.2372 19.081ZM20.9937 13.0452C20.84 13.2769 18.2748 13.7258 16.5861 15.0051C16.5861 15.0051 16.4522 14.9218 16.4866 14.8435C17.6144 12.7429 20.3466 13.021 20.9937 13.0452ZM15.9427 10.7688C16.2942 9.50572 17.7808 8.93662 18.8674 8.82043L19.0695 8.79869C18.7809 9.33455 17.0631 9.80518 16.0503 10.9058C16.0503 10.9058 15.9154 10.8663 15.9427 10.7688ZM12.6514 10.5678C12.6514 10.6843 12.5064 10.6619 12.5064 10.6619C12.5064 10.6619 11.1322 9.59767 9.79212 8.73004C9.72673 8.70363 9.73199 8.6502 9.73199 8.6502C11.3476 8.80894 12.5197 9.75299 12.6514 10.5678ZM12.2126 14.7944C12.2126 14.8581 12.0951 14.8752 12.0951 14.8752C11.9662 14.8665 10.9094 14.2955 10.0537 13.8808C9.00214 13.3704 7.81206 13.0657 7.81206 13.0657C9.97838 12.825 11.3163 13.408 12.0778 14.522C12.1599 14.6447 12.203 14.7028 12.2126 14.7944ZM5.86796 17.8524C5.87694 17.7831 7.16217 17.5921 7.63479 17.5921C10.1578 17.5921 11.4015 19.0105 11.4263 19.1161C11.4257 19.1792 11.3309 19.2109 11.3209 19.2109C11.0268 19.2034 8.09192 18.027 5.94606 17.9027C5.94606 17.9027 5.86982 17.8742 5.86796 17.8524Z" fill="#100B00" />
                            </g>
                            <defs>
                                <clipPath id="clip0_176_323">
                                    <rect width="28.6" height="26" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>

                        <div style={{
                            height: '1px',
                            width: '90%',
                            background: "rgb(187, 194, 194)",
                        }}></div>

                        <span onclick={() => { setSidebarWidth(280); setCollapsed(false) }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 18V16H16V18H3ZM19.6 17L14.6 12L19.6 7L21 8.4L17.4 12L21 15.6L19.6 17ZM3 13V11H13V13H3ZM3 8V6H16V8H3Z" fill="#5F5E5C" />
                            </svg>

                        </span>

                        <div style={{
                            height: '1px',
                            width: '90%',
                            background: "rgb(187, 194, 194)",
                        }}></div>
                    </div>
                }
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
                            editMode={editMode}
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
                <AOLabUpdateCard />
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