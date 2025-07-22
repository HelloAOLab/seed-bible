await os.unregisterApp('main')
os.registerApp('main', thisBot)
const { useEffect, useState, render } = os.appHooks;
import { BibleVariablesProvider } from 'app.hooks.bibleVariables'
import { TabsProvider } from 'app.hooks.tabs'
import { SideBarProvider } from 'app.hooks.sideBar'
import { MouseMoveProvider } from 'app.hooks.mouseMove'
import Layout from 'app.components.layout'
import { SplitApp, useDivSpliter } from 'app.hooks.divSpliter'
import { ThePage, ThePageWithPanel, ThePageWithEditor } from 'app.components.thePage'
import { useBibleContext } from 'app.hooks.bibleVariables'
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar'
//this for defining nav functions globaly
globalThis.Open = () => { }
globalThis.OpenNextChapter = () => { }
globalThis.OpenPrevChapter = () => { }
globalThis.SpaceLayouts = {}; // To store layout per space
globalThis.SpaceScreens = {}; // Already used for screen count


const Main = () => {
    const { screens, fullScreen, setFullScreen } = useBibleContext()
    const { collapsed, sidebarWidth, setSidebarWidth, themeColors } = useSideBarContext()
    const { tabs, activeSpace, getAllTabsInSpace } = useTabsContext();
    const [started, setStarted] = useState(false)

    const { containerProps, updateContainerSize, removeApplicationByID, replaceApplication, addApplication, resetApps, removeApplication, setApps } = useDivSpliter({
        components: [
            { id: `panel-${0}-${activeSpace}`, App: <ThePageWithEditor panelId={`panel-${0}-${activeSpace}`} tab={tabs[0]} />, to: 'window' },
        ],
        split: true,
        containerWidth: 1150,
        containerHeight: 920,
        minSize: 100,
    });

    globalThis.AddApplication = addApplication
    globalThis.RemoveApplication = removeApplication
    globalThis.AddApplication = addApplication;
    globalThis.RemoveApplicationByID = removeApplicationByID;
    globalThis.ReplaceApplication = replaceApplication
    useEffect(() => {
        setStarted(true)
    }, [])
    useEffect(() => {
        if (!started)
            return
        const newApps = [];

        for (let i = 0; i < screens.value; i++) {
            const id = `panel-${i}-${activeSpace}`;
            newApps.push({
                id,
                App: <ThePageWithEditor key={id} panelId={id} tab={globalThis.PanelTabsMap[id]} />,
                to: 'window',
                tabData: globalThis.PanelTabsMap[id],
            });
        }
        // console.log(newApps)
        setApps(newApps); // ✅ Update all at once

        globalThis.SpaceScreens[activeSpace] = screens.value;
    }, [screens]);


    useEffect(() => {
        if (!started) return;

        const savedScreens = globalThis.SpaceScreens[activeSpace] || 1;
        const newApps = [];

        for (let i = 0; i < savedScreens; i++) {
            const id = `panel-${i}-${activeSpace}`;
            newApps.push({
                id,
                App: <ThePageWithEditor key={id} panelId={id} tab={globalThis.PanelTabsMap[id]} />,
                to: 'window',
                tabData: globalThis.PanelTabsMap[id],
            });
        }
        console.log(newApps)
        setApps(newApps); // ✅ Update all at once
        setTimeout(() => {
            if (tabs.length === 1 && savedScreens === 1) {
                console.log('testing update now working', tabs[0])
                globalThis.UpdateTab(tabs[0])
            }
        }, 10)
        globalThis.SpaceScreens[activeSpace] = savedScreens;

    }, [activeSpace]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    // const resize = () => {
    // }
    function handleResize() {
        setIsMobile(window.innerWidth < 768);
        let mob = window.innerWidth < 768
        setTimeout(() => {
            updateContainerSize(globalThis.window?.innerWidth - (!fullScreen && !mob && sidebarWidth), globalThis.window?.innerHeight * 0.98)
        }, 0)
    }
    useEffect(() => {
        handleResize()
        globalThis.window?.addEventListener("resize", handleResize);
        return () => {
            globalThis.window?.removeEventListener('resize', handleResize);
        };
    }, [collapsed, fullScreen, sidebarWidth])
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         resize()
    //     }, 100);
    //     return () => clearInterval(interval);
    // }, [collapsed]);
    useEffect(() => {
        os.log(themeColors, 'theme colors')
    }, [themeColors])
    const lenght = Object.keys(themeColors || {}).length
    return <MouseMoveProvider>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <style>{`
        :root{
          --themeBackground:${lenght !==0 && themeColors[`${activeSpace}`]?.background || `white`};
          --themePanel:${lenght !==0 && themeColors[`${activeSpace}`]?.panel || null};
          --themeSideMenu:${lenght !==0 && themeColors[`${activeSpace}`]?.sideMenu || `#f0f1f1`};
          --themeToolbar:${lenght !==0 && themeColors[`${activeSpace}`]?.toolbar || `white`};
          --themeText1:${lenght !==0 && themeColors[`${activeSpace}`]?.text1 || `#606060`};
          --themeText2:${lenght !==0 && themeColors[`${activeSpace}`]?.text2 || `#000`};
        }
      `}</style>
        <Layout>
            <SplitApp {...containerProps} panalMode={false} />
        </Layout>
    </MouseMoveProvider>
}

const Root = () => {
    return <>
        <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.17/index.global.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/fullcalendar/timegrid@6.1.17/index.global.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/fullcalendar/interaction@6.1.17/index.global.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/main.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/main.min.css" />
        <BibleVariablesProvider>
            <TabsProvider>
                <SideBarProvider>
                    <Main />
                </SideBarProvider>
            </TabsProvider>
        </BibleVariablesProvider>
    </>

}
if (configBot.tags.systemPortal) return
configBot.tags.gridPortal = null;
render(<Root />, document.body)
// os.compileApp('main', <Root />)