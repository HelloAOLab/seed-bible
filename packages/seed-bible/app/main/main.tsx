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

const Main = () => {
    const { screens } = useBibleContext()
    const { collapsed } = useSideBarContext()
    const { tabs } = useTabsContext();


    const { containerProps, updateContainerSize, removeApplicationByID, addApplication, resetApps, removeApplication } = useDivSpliter({
        components: [
            { App: <ThePageWithEditor tab={tabs[0]} />, to: 'window' },
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

    useEffect(() => {
        if (screens === 1) {
            resetApps()
        } else {
            resetApps()
            for (let i = 1; i < screens; i++) {
                const id = uuid()
                addApplication(
                    { id, App: <ThePageWithEditor id={id} />, to: 'window' }
                )

            }
        }
    }, [screens]);



    // const resize = () => {
    // }
    function handleResize() {
        updateContainerSize(globalThis.window?.innerWidth - (collapsed ? 100 : 300), globalThis.window?.innerHeight * 0.98)
    }
    useEffect(() => {
        handleResize()
        globalThis.window?.addEventListener("resize", handleResize);
        return () => {
            globalThis.window?.removeEventListener('resize', handleResize);
        };
    }, [collapsed])

    useEffect(async () => {
        const authBot = await os.requestAuthBotInBackground();
        if (authBot) {
            window.clUserId = authBot.id;
        }
    }, [])
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         resize()
    //     }, 100);
    //     return () => clearInterval(interval);
    // }, [collapsed]);
    return <MouseMoveProvider>
        <Layout>
            <SplitApp {...containerProps} panalMode={false} />
        </Layout>
    </MouseMoveProvider>
}

const Root = () => {
    return <>
     <script src="'https://unpkg.com/@popperjs/core@2'"></script>
        <script src="https://unpkg.com/tippy.js@6/dist/tippy-bundle.umd.min.js"></script>
        <link rel='stylesheet' href='https://unpkg.com/tippy.js@6/dist/tippy.css'/>
       <script src="https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js"></script>
       <script src="https://cdn.jsdelivr.net/npm/fullcalendar/interaction@6.1.18/index.global.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/resource-common@6.1.18/index.global.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.18/index.global.min.js"></script>
       

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
configBot.tags.gridPortal = "home"
render(<Root />, document.body)
// os.compileApp('main', <Root />)