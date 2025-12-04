const { createContext, useContext, useState, useEffect } = os.appHooks;
const MyContext = createContext();
// import { StudyNotes, StudyNotesWithPanel } from 'app.sn_components.studyNotes';
import { MenuIcon, SeedBibleIcon, AiIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist, AiChatIcon } from 'app.components.icons';

// import { useMouseMove, } from 'app.hooks.mouseMove';
export function BibleVariablesProvider({ children }) {
    const [screens, setScreens] = useState(1)
    const [navFunctions, setNavFunctions] = useState({});
    const [appSettings, setAppSettings] = useState({})
    const [panelMode, setPanelMode] = useState(false)
    globalThis.panelMode = panelMode
    const [canvasMode, setCanvasMode] = useState(false)
    const [mapMode, setMapMode] = useState(false);
    const [showHeading, setShowHeading] = useState({'1':true,'2':true,'3':true});
    const [showVerses, setShowVerses] = useState({'1':true,'2':true,'3':true});
    const [ReSeed, setReSeed] = useState()
    useEffect(() => {
        globalThis.ToolbarReSeedMode?.(ReSeed)
    }, [ReSeed])
    // const { isDragging, setIsDragging, Element, setElement } = useMouseMove()
    const [tools, setTools] = useState([
        // {
        //     icon: <SeedBibleIcon />,
        //     // isImg: true,
        //     label: 'Books',
        //     hasToggle: true,
        //     active: true,
        //     onClick: () => {
        //         setOpenSidebar(prev => !prev);
        //         setCurrentExperience(0);
        //     }
        // },
        // {
        //     icon: 'playlist_play', label: 'Playlist', hasToggle: true, active: true,
        //     onHold: async () => {
        //         let id = uuid();
        //         let PlayList = await globalThis.Playlist.tryInitPlaylistMaker();
        //         // if (PlayList) {
        //         //     if (!panelMode) {
        //         globalThis.PLAYLIST_PANEL_ID = id;
        //         SetIsDragging(true);
        //         globalThis.SetElement({
        //             App: <span className="material-symbols-outlined">playlist_play</span>,
        //             data: { id, App: <PlayList id={id} />, to: 'panel', minWidth: '23rem' }
        //         })
        //         //     }
        //         // }
        //     },
        //     onClick: async () => {
        //         if (globalThis.makingPlaylist) {
        //             globalThis.isRecording = false;
        //             globalThis.SelectedItemIDForAttachments = null;
        //             globalThis.Playlist.RemoveScreenRecordingControls();
        //             try {
        //                 await experiment.endRecording();
        //             } catch (err) { }
        //             globalThis.StopVideoRecording = false;
        //             RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
        //             globalThis.PLAYLIST_PANEL_ID = null;
        //             globalThis.PlayingPlaylist = null;
        //             globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
        //                 globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
        //             globalThis.IsQueuePresent = false;
        //             globalThis.IS_PLAYLIST_ACTIVE = false;
        //             globalThis.SetSplitAppPanel2(null);
        //             globalThis.makingPlaylist = false;
        //             return;
        //         }

        //         console.log("Playlist", Playlist, globalThis.Playlist);

        //         let PlayList = await globalThis.Playlist.tryInitPlaylistMaker();
        //         if (PlayList) {
        //             if (!panelMode) {
        //                 let id = uuid();
        //                 globalThis.PLAYLIST_PANEL_ID = id;
        //                 AddApplication({
        //                     id,
        //                     App: <PlayList id={id} />,
        //                     to: "panel",
        //                     minWidth: "23rem",
        //                 });
        //             }
        //         }
        //     }
        // },
        {
            // icon: 'chat',
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f89ebc25a02acbfb56957a90bdddb7d938f5ba54fc045fa0ef108a0ff30821bb.svg',
            label: 'Apologist',
            hasToggle: true,
            active: false,
            isImg: true,
            onHold: async () => {
                globalThis.chatbotPresent = true;
                const id = uuid();
                globalThis.CHATBOT_PANEL_ID = id;
                SetIsDragging(true);
                globalThis.SetElement({
                    App: <ImageWrapper>
                        <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f89ebc25a02acbfb56957a90bdddb7d938f5ba54fc045fa0ef108a0ff30821bb.svg" style={{ width: '20px' }} />
                    </ImageWrapper>,
                    data: { id, App: <iframe style={{ width: '100%', height: '100%' }} src={'https://ao.discipleship.bot/en'} id={id} />, to: 'panel', minWidth: '30rem' }
                })
            },
            onClick: async () => {
                if (globalThis.chatbotPresent) {
                    RemoveApplicationByID(globalThis.CHATBOT_PANEL_ID);
                    globalThis.CHATBOT_PANEL_ID = null;
                    globalThis.chatbotPresent = false;
                    return;
                }
                if (!panelMode) {
                    globalThis.chatbotPresent = true;
                    const id = uuid();
                    globalThis.CHATBOT_PANEL_ID = id;
                    AddApplication({ id, App: <iframe style={{ width: '100%', height: '100%' }} src={'https://ao.discipleship.bot/en'} id={id} />, to: 'panel', minWidth: '30rem' })
                }
            }
        },
        {
            // icon: 'chat',
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7778fa1fe5114c8b06d09505ffd6e465752ba170c21a34ea842be4a86492c7cf.webp',
            label: 'Tapos',
            hasToggle: true,
            active: false,
            isImg: true,
            onHold: async () => {
                globalThis.TapozChatboxPresent = true;
                const id = uuid();
                globalThis.TAPOZ_CHATBOX_UI_ID = id;
                SetIsDragging(true);
                globalThis.SetElement({
                    App: <ImageWrapper>
                        <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7778fa1fe5114c8b06d09505ffd6e465752ba170c21a34ea842be4a86492c7cf.webp" style={{ width: '20px' }} />
                    </ImageWrapper>,
                    data: { id, App: <iframe style={{ width: '100%', height: '100%' }} src={'https://splinteredglass.retool.com/embedded/public/54c38714-4799-45c8-8663-961af09fafce#oid=67355031aea5f406546577d0'} id={id} />, to: 'panel', minWidth: '30rem' }
                })
            },
            onClick: async () => {

                const TapozChat = await Tapoz.ChatbotUI();

                if (globalThis.TapozChatboxPresent) {
                    RemoveApplicationByID(globalThis.TAPOZ_CHATBOX_UI_ID);
                    globalThis.TAPOZ_CHATBOX_UI_ID = null;
                    globalThis.TapozChatboxPresent = false;
                    return;
                }
                if (!panelMode) {
                    globalThis.TapozChatboxPresent = true;
                    const id = uuid();
                    globalThis.TAPOZ_CHATBOX_UI_ID = id;
                    // AddApplication({ id, App: <TapozChat id={id} />, to: 'panel', minWidth: '30rem' })
                    AddApplication({ id, App: <iframe style={{ width: '100%', height: '100%' }} src={'https://splinteredglass.retool.com/embedded/public/54c38714-4799-45c8-8663-961af09fafce#oid=67355031aea5f406546577d0'} id={id} />, to: 'panel', minWidth: '30rem' })
                }
            }
        },
        // {
        //     icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c6a9b2acc629e207b0891f7a8d95d8cb0b2110b6cb99fc3e1b44944e19d09c0.gif',
        //     label: 'Loading',
        //     hasToggle: true,
        //     active: true,
        //     isImg: true,
        //     onClick: async () => {

        //     }
        // },
        // {
        //     icon: 'splitscreen_right',
        //     label: 'Study Notes',
        //     hasToggle: true,
        //     active: false,
        //     onRightClick: () => {
        //         const MenuOptions = {
        //             type: 'normal', items: [
        //                 { icon: <MenuIcon name="open_in_new" />, title: 'open', onClick: () => { openStudyNotes() } },
        //                 { type: 'line' },
        //                 { icon: <MenuIcon name="edit" />, title: 'Edit mode', onClick: () => { globalThis?.SetEnableEditStudyNotes(prev => !prev) } },

        //             ]
        //         };

        //         openPopupSettings(MenuOptions)
        //     },
        //     onClick: async () => {
        //         openStudyNotes()
        //     }
        // },
    ]);
    function openStudyNotes() {
        if (globalThis.studyNotesPresent) {
            RemoveApplicationByID(globalThis.STUDYNOTES_PANEL_ID);
            globalThis.STUDYNOTES_PANEL_ID = null;
            globalThis.studyNotesPresent = false;
            return;
        }
        if (!panelMode) {
            globalThis.studyNotesPresent = true;
            const id = uuid();
            globalThis.STUDYNOTES_PANEL_ID = id;
            AddApplication({
                id,
                App: <StudyNotes id={id} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
                minWidth: '30rem'
            });
        }
    }
    const [canvasTools, setCanvasTools] = useState([
    ]);

    const [mapTools, setMapTools] = useState([
    ]);

    useEffect(() => {
        globalThis.CanvasMode = canvasMode;
        window.CanvasMode = canvasMode
        return () => {
            globalThis.CanvasMode = null;
            window.CanvasMode = null;
        }
    }, [canvasMode]);

    useEffect(() => {
        globalThis.SetScreens = setScreens;
        return () => {
            globalThis.SetScreens = null;
        }
    }, [screens]);
    const [fullScreen, setFullScreen] = useState(false)
    function addTool(tool, { to = 'tools' } = {}) {
        const setTarget = to === 'canvas' ? setCanvasTools : to === 'map' ? setMapTools : setTools;
        const target = to === 'canvas' ? canvasTools : to === 'map' ? mapTools : tools;
        setTarget([...target, tool]);
    }

    function removeTool(label, { from = 'tools' } = {}) {
        const setTarget = from === 'canvas' ? setCanvasTools : from === 'map' ? setMapTools : setTools;
        const target = from === 'canvas' ? canvasTools : from === 'map' ? mapTools : tools;
        setTarget(target.filter(tool => tool.label !== label));
    }

    function updateTool(label, newProps, { inSet = 'tools' } = {}) {
        const setTarget = inSet === 'canvas' ? setCanvasTools : inSet === 'map' ? setMapTools : setTools;
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;
        setTarget(target.map(tool => tool.label === label ? { ...tool, ...newProps } : tool));
    }

    function toggleToolActive(label, custom, { inSet = 'tools' } = {}) {
        const setTarget = inSet === 'canvas' ? setCanvasTools : inSet === 'map' ? setMapTools : setTools;
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;
        setTarget(target.map(tool => tool.label === label ? { ...tool, active: custom === 'stop' ? false : custom === 'active' ? true : !tool.active } : tool));
    }
    function isToolActive(label, { inSet = 'tools' } = {}) {
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;
        const tool = target.find(tool => tool.label === label);
        return tool?.active === true;
    }
    function toToggleShowInPageToolbar(label, { inSet = 'tools' } = {}) {
        const setTarget = inSet === 'canvas' ? setCanvasTools : inSet === 'map' ? setMapTools : setTools;
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;

        const updated = target.map(tool => {
            if (tool.label === label) {
                return {
                    ...tool,
                    showInPageToolbar: tool.hasOwnProperty('showInPageToolbar')
                        ? !tool.showInPageToolbar
                        : true
                };
            }
            return tool;
        });

        setTarget(updated);
    }
    function toToggleShowInStarterToolbar(label, { inSet = 'tools' } = {}) {
        const setTarget = inSet === 'canvas' ? setCanvasTools : inSet === 'map' ? setMapTools : setTools;
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;

        const updated = target.map(tool => {
            if (tool.label === label) {
                return {
                    ...tool,
                    showInStarterToolbar: tool.hasOwnProperty('showInStarterToolbar')
                        ? !tool.showInStarterToolbar
                        : true
                };
            }
            return tool;
        });

        setTarget(updated);
    }

    function isToolInPageToolbar(label, { inSet = 'tools' } = {}) {
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;
        const tool = target.find(tool => tool.label === label);
        return tool?.showInPageToolbar === true;
    }
    function isToolSraterToolbar(label, { inSet = 'tools' } = {}) {
        const target = inSet === 'canvas' ? canvasTools : inSet === 'map' ? mapTools : tools;
        const tool = target.find(tool => tool.label === label);
        return tool?.showInStarterToolbar === true;
    }

    function scrollToVerse(verseNumber) {
        const element = document.getElementById(`v-${verseNumber}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth", // smooth scrolling animation
            block: "center", // scroll so it's centered in the viewport
          });
        } else {
          console.warn(`Verse ${verseNumber} not found`);
        }
    }

    globalThis.AddTool = addTool
    globalThis.RemoveTool = removeTool
    globalThis.UpdateTool = updateTool
    globalThis.ToggleToolActive = toggleToolActive
    globalThis.IsToolActive = isToolActive
    globalThis.ToToggleShowInPageToolbar = toToggleShowInPageToolbar
    globalThis.ToToggleShowInStarterToolbar = toToggleShowInStarterToolbar
    globalThis.IsToolInPageToolbar = isToolInPageToolbar
    globalThis.IsToolSraterToolbar = isToolSraterToolbar

    return (
        <MyContext.Provider
            value={{
                ReSeed, setReSeed, screens, fullScreen, setFullScreen,
                tools, setTools, setScreens, navFunctions, setNavFunctions,
                panelMode, setPanelMode, canvasMode, setCanvasMode, mapMode, setMapMode,
                canvasTools, mapTools, setCanvasTools, setMapTools,
                addTool, removeTool, updateTool, toggleToolActive,scrollToVerse,showHeading, setShowHeading,
showVerses, setShowVerses
            }}
        >

            {children}
        </MyContext.Provider>
    );
}
export function useBibleContext() {
    return useContext(MyContext);
}

