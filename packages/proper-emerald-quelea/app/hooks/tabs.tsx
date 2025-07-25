const { createContext, useContext, useState, useEffect } = os.appHooks;
// const localStorage = getBot('system', 'app.localStorage')
// const tabsData = localStorage.masks.tabsData
// if (!tabsData) {
//     localStorage.masks.tabsData = [
//         { id: uuid(), taken: false, data: { use: 'thePage', type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 10, translation: 'BSB' } },
//     ]
// }
import { useBibleContext } from 'app.hooks.bibleVariables'

const MyContext = createContext();

export function TabsProvider({ children }) {
    const { tools, setTools } = useBibleContext();
    const [spaces, setSpaces] = useState([
        {
            id: uuid(),
            name: 'Space 1',
            settings: {
                theme: {},
                toolbar: {
                    tools
                },
                text: {},
            },
            folders: [
                // { id: uuid(), name: 'Folder 1', tabs: [{ id: uuid(), taken: false, data: { use: 'thePage', first: true, type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 1, translation: 'BSB' } }] }
            ],
            tabs: [{ id: uuid(), taken: false, data: { use: 'thePage', first: true, type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 1, translation: 'BSB' } }] // Standalone tabs (not in a folder)
        },
        {
            id: uuid(),
            name: 'Space 2',
            settings: {
                theme: {},
                toolbar: {
                    tools
                },
                text: {},
            },
            folders: [],
            tabs: [{ id: uuid(), taken: false, data: { use: 'thePage', first: true, type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 1, translation: 'BSB' } }],
        },
        {
            id: uuid(),
            name: 'Space 3',
            settings: {
                theme: {},
                toolbar: {
                    tools
                },
                text: {},
            },
            folders: [],
            tabs: [{ id: uuid(), taken: false, data: { use: 'thePage', first: true, type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 1, translation: 'BSB' } }]
        }
    ]);
    const [activeSpace, setActiveSpace] = useState(spaces[0].id);
    const [activeTab, setActiveTab] = useState(null);
    const { setScreens, screens } = useBibleContext()
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedTabs, setSelectedTabs] = useState([]);

    // Get current space
    const activeSpaceData = spaces.find(space => space.id === activeSpace) || spaces[0];
    const { folders = [], tabs = [] } = activeSpaceData || {};
    useEffect(() => {
        masks[`lastactive_tab_${activeSpace}`] = activeTab
    }, [activeTab])
    // useEffect(() => {
    //     os.log(masks[activeSpace], activeSpace, 'spaces[activeSpace]?.screens')
    //     setScreens(masks[activeSpace] || 1)
    //     // const prev = screens
    //     // setScreens(1)
    //     let id = masks[`lastactive_tab_${activeSpace}`] || tabs[0]?.id
    //     setActiveTab(id)
    //     // os.log(id, tabs, 'masks[`lastactive_tab_${activeSpace}`]')
    //     let tab = getAllTabsInSpace(spaces.find(space => space.id === activeSpace)).find(e => e.id === id)
    //     // os.log(globalThis.UpdateTab, tab, id, 'globalThis.UpdateTab')
    //     if (tab) {
    //         if(globalThis.UpdateTab)
    //         globalThis.UpdateTab(tab)
    //         // os.log('globalThis.Open',globalThis.Open)
    //         // globalThis.Open(tab.data.id, tab.data.chapter, tab.data.translation)
    //         // updateActiveTab(tab.data)
    //     }
    //     // setTimeout(() => {
    //     // }, 0)
    // }, [activeSpace])
    const updateToolsForSpace = (spaceId, tools) => {
        setSpaces(prev =>
            prev.map(space =>
                space.id === spaceId
                    ? {
                        ...space,
                        settings: {
                            ...space.settings,
                            toolbar: {
                                ...space.settings.toolbar,
                                tools,
                            },
                        },
                    }
                    : space
            )
        );
    };

    // Add standalone tab (not in a folder)
    const addTab = (tab) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? { ...space, tabs: [...space.tabs, tab] }
                    : space
            )
        );
    };

    // Remove standalone tab
    const removeTab = (tabId) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space => {
                if (space.id !== activeSpace) return space;

                // Remove from standalone tabs
                const updatedTabs = space.tabs.filter(tab => tab.id !== tabId);

                // Remove from folders
                const updatedFolders = space.folders.map(folder => ({
                    ...folder,
                    tabs: folder.tabs.filter(tab => tab.id !== tabId)
                }));

                return {
                    ...space,
                    tabs: updatedTabs,
                    folders: updatedFolders
                };
            })
        );
    };

    const getAllTabsInSpace = (spaceId) => {
        // Gather standalone tabs
        const space = spaces.find(space => space.id === spaceId)
        let allTabs = [...space.tabs];

        // Gather tabs from each folder
        space.folders.forEach(folder => {
            allTabs = allTabs.concat(folder.tabs);
        });

        return allTabs;
    };
    // Update tab
    const updateTab = (tabId, newData) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? {
                        ...space,
                        tabs: space.tabs.map(tab =>
                            tab.id === tabId ? { ...tab, data: { ...tab.data, ...newData } } : tab
                        ),
                        folders: space.folders.map(folder => ({
                            ...folder,
                            tabs: folder.tabs.map(tab =>
                                tab.id === tabId ? { ...tab, data: { ...tab.data, ...newData } } : tab
                            )
                        }))
                    }
                    : space
            )
        );
    };
    function updateActiveTab(newData) {
        updateTab(activeTab, newData)
    }
    const updateSpace = (spaceId, newData) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === spaceId
                    ? { ...space, ...newData }
                    : space
            )
        );
    };

    const manageTab = (action, tab, folderId = null) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? {
                        ...space,
                        // Remove the tab from standalone tabs if it exists there
                        tabs: space.tabs.filter(t => t.id !== tab.id),

                        // Remove the tab from any folder it may exist in
                        folders: space.folders.map(folder => ({
                            ...folder,
                            tabs: folder.tabs.filter(t => t.id !== tab.id)
                        })),

                        // Now add the tab to the specified location if action is "add"
                        ...(action === "add"
                            ? folderId
                                ? {
                                    folders: space.folders.map(folder =>
                                        folder.id === folderId
                                            ? { ...folder, tabs: [...folder.tabs, tab] }
                                            : folder
                                    )
                                }
                                : { tabs: [...space.tabs, tab] }
                            : {})
                    }
                    : space
            )
        );
    };


    // Folder Management
    const addFolder = (folderName) => {
        const newFolder = { id: uuid(), name: folderName, tabs: [] };
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace ? { ...space, folders: [...space.folders, newFolder] } : space
            )
        );
    };
    function downloadSpaceAsJSON(spaceId) {
        const space = spaces.find(s => s.id === spaceId);
        if (!space) {
            console.warn(`Space with ID ${spaceId} not found.`);
            return;
        }
        space.recorededData = globalThis.PanelTabsMap
        space.screens = globalThis.SpaceScreens[spaceId]
        space.panelsRatios = globalThis.SpaceLayouts[spaceId]
        const fileName = `${space.name.replace(/\s+/g, '_')}_${space.id}.json`;
        const json = JSON.stringify(space, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    function replaceActiveSpaceWithJSON(json, spaceId) {
        const importedSpace = JSON.parse(json.data)
        // importedSpace = JSON.parse(importedSpace)
        os.log(importedSpace)
        if (!importedSpace || !importedSpace.name || !importedSpace.tabs) {
            console.warn("Invalid imported space data.");
            return;
        }

        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === spaceId
                    ? {
                        ...space,
                        name: importedSpace.name,
                        folders: importedSpace.folders || [],
                        tabs: importedSpace.tabs || [],
                        settings: importedSpace.settings || {
                            theme: {},
                            toolbar: {},
                            text: {}
                        }
                    }
                    : space
            )
        );

        // Restore optional global mappings
        if (importedSpace.recorededData) {
            globalThis.PanelTabsMap = { ...globalThis.PanelTabsMap, ...importedSpace.recorededData };
        }
        if (importedSpace.screens) {
            globalThis.SetScreens({ value: importedSpace.screens });
            globalThis.SpaceScreens[spaceId] = importedSpace.screens;
        }
        if (importedSpace.panelsRatios) {
            globalThis.SpaceLayouts[spaceId] = importedSpace.panelsRatios;
        }

        // Optionally update the active tab to the first tab in imported data
        const firstTabId = importedSpace.tabs?.[0]?.id || null;
        setActiveTab(firstTabId);
    }

    const removeFolder = (folderId) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace ? { ...space, folders: space.folders.filter(folder => folder.id !== folderId) } : space
            )
        );
    };

    const addTabToFolder = (folderId, tab) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? {
                        ...space, folders: space.folders.map(folder =>
                            folder.id === folderId ? { ...folder, tabs: [...folder.tabs, tab] } : folder
                        )
                    }
                    : space
            )
        );
    };
    const addTabsToFolder = (folderId, tabs) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? {
                        ...space, folders: space.folders.map(folder =>
                            folder.id === folderId ? { ...folder, tabs: [...folder.tabs, ...tabs] } : folder
                        )
                    }
                    : space
            )
        );
    };

    const removeTabFromFolder = (folderId, tabId) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space =>
                space.id === activeSpace
                    ? {
                        ...space, folders: space.folders.map(folder =>
                            folder.id === folderId ? { ...folder, tabs: folder.tabs.filter(tab => tab.id !== tabId) } : folder
                        )
                    }
                    : space
            )
        );
    };

    const addSpace = (spaceName, icon = null) => {
        const newSpace = {
            id: uuid(),
            name: spaceName,
            icon,  // Adding icon property here
            settings: {
                theme: {},
                toolbar: {},
                text: {},
            },
            folders: [],
            tabs: [{ id: uuid(), taken: false, data: { use: 'thePage', first: true, type: 'book', book: 'Genesis', bookId: 'GEN', chapter: 1, translation: 'BSB' } }]
        };
        setSpaces(prevSpaces => [...prevSpaces, newSpace]);
    };
    const moveTab = (tabId, newFolderId = null) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space => {
                if (space.id !== activeSpace) return space; // Skip other spaces

                let foundTab = null;
                let isAlreadyInTarget = false;

                // Remove from standalone tabs if present
                const updatedTabs = space.tabs.filter(tab => {
                    if (tab.id === tabId) {
                        foundTab = tab; // Store tab data
                        if (!newFolderId) isAlreadyInTarget = true; // Already in standalone
                        return false; // Remove from standalone
                    }
                    return true;
                });

                // Remove from folders if present
                const updatedFolders = space.folders.map(folder => {
                    const filteredTabs = folder.tabs.filter(tab => {
                        if (tab.id === tabId) {
                            foundTab = tab; // Store tab data
                            if (folder.id === newFolderId) isAlreadyInTarget = true; // Already in target folder
                            return false; // Remove from folder
                        }
                        return true;
                    });

                    return { ...folder, tabs: filteredTabs };
                });

                // If the tab is already in the correct location, do nothing
                if (isAlreadyInTarget || !foundTab) return space;

                // Move the tab to the new location
                if (newFolderId) {
                    return {
                        ...space,
                        tabs: updatedTabs, // Update standalone tabs
                        folders: updatedFolders.map(folder =>
                            folder.id === newFolderId
                                ? { ...folder, tabs: [...folder.tabs, foundTab] } // Move tab inside folder
                                : folder
                        )
                    };
                } else {
                    return {
                        ...space,
                        tabs: [...updatedTabs, foundTab], // Move tab to standalone
                        folders: updatedFolders // Update folders
                    };
                }
            })
        );
    };
    const moveMultipleTabs = (tabIds, newFolderId = null) => {
        setSpaces(prevSpaces =>
            prevSpaces.map(space => {
                if (space.id !== activeSpace) return space;

                const foundTabs = [];
                const tabsToMoveSet = new Set(tabIds);
                const alreadyInTarget = new Set();

                // Remove from standalone tabs
                const updatedTabs = space.tabs.filter(tab => {
                    if (tabsToMoveSet.has(tab.id)) {
                        if (!newFolderId) alreadyInTarget.add(tab.id);
                        foundTabs.push(tab);
                        return false; // Remove tab
                    }
                    return true;
                });

                // Remove from folders
                const updatedFolders = space.folders.map(folder => {
                    const filteredTabs = folder.tabs.filter(tab => {
                        if (tabsToMoveSet.has(tab.id)) {
                            if (folder.id === newFolderId) alreadyInTarget.add(tab.id);
                            foundTabs.push(tab);
                            return false;
                        }
                        return true;
                    });
                    return { ...folder, tabs: filteredTabs };
                });

                // Skip if all tabs are already in the target
                if (foundTabs.length === alreadyInTarget.size) return space;

                // Filter out tabs already in the target
                const tabsToActuallyMove = foundTabs.filter(tab => !alreadyInTarget.has(tab.id));

                if (newFolderId) {
                    return {
                        ...space,
                        tabs: updatedTabs,
                        folders: updatedFolders.map(folder =>
                            folder.id === newFolderId
                                ? { ...folder, tabs: [...folder.tabs, ...tabsToActuallyMove] }
                                : folder
                        )
                    };
                } else {
                    return {
                        ...space,
                        tabs: [...updatedTabs, ...tabsToActuallyMove],
                        folders: updatedFolders
                    };
                }
            })
        );
    };

    const removeSpace = (spaceId) => {
        setSpaces(prevSpaces => prevSpaces.filter(space => space.id !== spaceId));

        // Optionally, adjust the activeSpace if the removed space was the active one
        if (activeSpace === spaceId) {
            const remainingSpaces = spaces.filter(space => space.id !== spaceId);
            if (remainingSpaces.length > 0) {
                setActiveSpace(remainingSpaces[0].id); // Set active space to the first remaining space
            } else {
                setActiveSpace(null); // No remaining spaces, so set to null or handle appropriately
            }
        }
    };
    const getToolsForActiveSpace = () => {
        return (
            spaces.find(s => s.id === activeSpace)?.settings?.toolbar?.tools || []
        );
    };

    useEffect(() => {
        os.log(spaces, 'spaces updated')
    }, [spaces])

    return (
        <MyContext.Provider value={{
            spaces, activeSpace, setActiveSpace,
            tabs, addTab, removeTab, updateTab,
            folders, addFolder, removeFolder, addTabToFolder, addTabsToFolder, removeTabFromFolder, updateActiveTab,
            downloadSpaceAsJSON,
            activeTab, setActiveTab,
            manageTab, moveTab, moveMultipleTabs,
            updateToolsForSpace, getAllTabsInSpace,
            replaceActiveSpaceWithJSON,
            updateSpace, addSpace, removeSpace,
            multiSelectMode, setMultiSelectMode,
            selectedTabs, setSelectedTabs,
            getToolsForActiveSpace,
            currentSpace: spaces.find(e => e.id === activeSpace)
        }}>
            {children}
        </MyContext.Provider>
    );
}

export function useTabsContext() {
    return useContext(MyContext);
}
