const { createContext, useContext, useState, useEffect, useMemo } = os.appHooks;
import { Panal } from 'app.components.icons'
const MyContext = createContext();

export function BibleVariablesProvider({ children }) {
    const [screens, setScreens] = useState(1)
    const [navFunctions, setNavFunctions] = useState({});
    const [appSettings, setAppSettings] = useState({})
    const [panelMode, setPanelMode] = useState(false)
    const [canvasMode, setCanvasMode] = useState(false)
    const [mapMode, setMapMode] = useState(false);
    const [tools, setTools] = useState([
        {
            icon: 'menu_book', label: 'Books', hasToggle: true, active: true, onClick: () => {
                setOpenSidebar(prev => !prev);
                setCurrentExperience(0);
            }
        },
        // { icon: <Panal />, label: 'Panel', hasToggle: true, active: true },
        {
            icon: 'playlist_play', label: 'Playlist', hasToggle: true, active: true,
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
            active: true,
            isImg: true,
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
    ]);

    const [canvasTools, setCanvasTools] = useState([]);

    const [mapTools, setMapTools] = useState([]);

    useEffect(() => {
        globalThis.SetScreens = setScreens;
        return () => {
            globalThis.SetScreens = null;
        }
    }, [screens]);

    useEffect(() => {
        globalThis.CanvasMode = canvasMode;
        return () => {
            globalThis.CanvasMode = null;
        }
    }, [canvasMode])

    return (
        <MyContext.Provider value={{ screens, tools, setTools, setScreens, navFunctions, setNavFunctions, panelMode, setPanelMode, canvasMode, setCanvasMode, mapMode, setMapMode, canvasTools, mapTools, setCanvasTools, setMapTools }}>
            {children}
        </MyContext.Provider>
    );
}
export function useBibleContext() {
    return useContext(MyContext);
}

