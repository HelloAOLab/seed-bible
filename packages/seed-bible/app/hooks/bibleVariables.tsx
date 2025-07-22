const { createContext, useContext, useState, useEffect } = os.appHooks;
import { Panal } from 'app.components.icons'
const MyContext = createContext();
// import { useMouseMove, } from 'app.hooks.mouseMove';
export function BibleVariablesProvider({ children }) {
    const [screens, setScreens] = useState(1)
    const [navFunctions, setNavFunctions] = useState({});
    const [appSettings, setAppSettings] = useState({})
    const [panelMode, setPanelMode] = useState(false)
    const [canvasMode, setCanvasMode] = useState(false)
    const [mapMode, setMapMode] = useState(false);
    // const { isDragging, setIsDragging, Element, setElement } = useMouseMove()
    const [tools, setTools] = useState([
        {
            icon: 'menu_book', label: 'Books', hasToggle: true, active: true, onClick: () => {
                setOpenSidebar(prev => !prev);
                setCurrentExperience(0);
            }
        },
        {
            icon: 'playlist_play', label: 'Playlist', hasToggle: true, active: false,
            onHold: async () => {
                let id = uuid();
                let PlayList = await Playlist.tryInitPlaylistMaker();
                console.log(PlayList)
                // if (PlayList) {
                //     if (!panelMode) {
                globalThis.PLAYLIST_PANEL_ID = id;
                SetIsDragging(true);
                globalThis.SetElement({
                    App: <span className="material-symbols-outlined">playlist_play</span>,
                    data: { id, App: <PlayList id={id} />, to: 'panel', minWidth: '23rem' }
                })
                //     }
                // }
            },
            onClick: async () => {
                // if (globalThis.makingPlaylist) {
                //     globalThis.SetSplitAppPanel?.(null);
                //     globalThis.SetSplitAppPanel2?.(null);
                //     globalThis.makingPlaylist = false;
                //     // setPanelMode(false)
                //     return setScreens(1);
                // }
                if (globalThis.makingPlaylist) {
                    RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
                    globalThis.PLAYLIST_PANEL_ID = null;
                    globalThis.makingPlaylist = false;
                    return;
                }

                let PlayList = await Playlist.tryInitPlaylistMaker();
                if (PlayList) {
                    if (!panelMode) {
                        let id = uuid();
                        globalThis.PLAYLIST_PANEL_ID = id;
                        AddApplication({ id, App: <PlayList id={id} />, to: 'panel', minWidth: '23rem' })
                    }
                }
            }
        },
        {
            // icon: 'chat',
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f89ebc25a02acbfb56957a90bdddb7d938f5ba54fc045fa0ef108a0ff30821bb.svg',
            label: 'Apologist',
            hasToggle: true,
            active: true,
            isImg: true,
            onHold: async () => {
                globalThis.chatbotPresent = true;
                let id = uuid();
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
                    let id = uuid();
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
                let id = uuid();
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

                let TapozChat = await Tapoz.ChatbotUI();

                if (globalThis.TapozChatboxPresent) {
                    RemoveApplicationByID(globalThis.TAPOZ_CHATBOX_UI_ID);
                    globalThis.TAPOZ_CHATBOX_UI_ID = null;
                    globalThis.TapozChatboxPresent = false;
                    return;
                }
                if (!panelMode) {
                    globalThis.TapozChatboxPresent = true;
                    let id = uuid();
                    globalThis.TAPOZ_CHATBOX_UI_ID = id;
                    // AddApplication({ id, App: <TapozChat id={id} />, to: 'panel', minWidth: '30rem' })
                    AddApplication({ id, App: <iframe style={{ width: '100%', height: '100%' }} src={'https://splinteredglass.retool.com/embedded/public/54c38714-4799-45c8-8663-961af09fafce#oid=67355031aea5f406546577d0'} id={id} />, to: 'panel', minWidth: '30rem' })
                }
            }
        },
        {
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c6a9b2acc629e207b0891f7a8d95d8cb0b2110b6cb99fc3e1b44944e19d09c0.gif',
            label: 'Loading',
            hasToggle: true,
            active: true,
            isImg: true,
            onClick: async () => {

            }
        }
    ]);

    const [canvasTools, setCanvasTools] = useState([
        // {
        //     icon: 'map',
        //     label: 'Map Swap',
        //     hasToggle: true,
        //     active: true,
        //     isImg: false,
        //     onClick: async () => {
        //         console.log(globalThis?.SetCurrentCanvasMode)
        //         if (globalThis?.SetCurrentCanvasMode) {
        //             SetCurrentCanvasMode('map')
        //         }
        //     }
        // },
        {
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c6a9b2acc629e207b0891f7a8d95d8cb0b2110b6cb99fc3e1b44944e19d09c0.gif',
            label: 'Loading',
            hasToggle: true,
            active: true,
            isImg: true,
            onClick: async () => {
            }
        }
    ]);

    const [mapTools, setMapTools] = useState([
        // {
        //     icon: 'deployed_code',
        //     label: 'Canvas Swap',
        //     hasToggle: true,
        //     active: true,
        //     isImg: false,
        //     onClick: async () => {
        //         console.log(globalThis?.SetCurrentCanvasMode)
        //         if (globalThis?.SetCurrentCanvasMode) {
        //             SetCurrentCanvasMode('canvas')
        //         }
        //     }
        // },
        {
            icon: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c6a9b2acc629e207b0891f7a8d95d8cb0b2110b6cb99fc3e1b44944e19d09c0.gif',
            label: 'Loading',
            hasToggle: true,
            active: true,
            isImg: true,
            onClick: async () => {
            }
        },
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

    return (
        <MyContext.Provider value={{ screens, fullScreen, setFullScreen, tools, setTools, setScreens, navFunctions, setNavFunctions, panelMode, setPanelMode, canvasMode, setCanvasMode, mapMode, setMapMode, canvasTools, mapTools, setCanvasTools, setMapTools }}>
            {children}
        </MyContext.Provider>
    );
}
export function useBibleContext() {
    return useContext(MyContext);
}

