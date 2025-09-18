await os.unregisterApp('main')
os.registerApp('main', thisBot)
const { useEffect, useState, useRef, render } = os.appHooks;


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
import { Person } from "https://cdn.skypack.dev/lucide-react";
import { PackageManager } from 'app.packager.main'
import { DragDropOverlay } from 'app.main.dragOverlay'
//this for defining nav functions globaly
globalThis.Open = () => { }
globalThis.OpenNextChapter = () => { }
globalThis.OpenPrevChapter = () => { }
globalThis.SpaceLayouts = {}; // To store layout per space
globalThis.SpaceScreens = {}; // Already used for screen count
globalThis.CheckToolbarOverflow = () => { }


const TestingApp = ({ myProp }) => {
    const divRef = useRef(null);
    const [css, setCss] = useState()
    // console.log(myProp, 'myProp')
    function runTest() {
        //     globalThis?.SetCanvasPosition?.(`
        //                  #app-game-container, .main-content {
        //     position:absolute !important;
        //     left:0 !important;
        //     top:0 !important;
        //     width:600px !important;
        //     height:600px !important;
        //     z-index:999999;
        //  }  
        //             `)
        if (divRef.current) {
            // const rect = divRef.current.getBoundingClientRect();
            // console.log("Left:", rect.left);
            // console.log("Top:", rect.top);
            // console.log("Width:", rect.width);
            // console.log("Height:", rect.height);
            // console.log(rect, 'rect')
            // configBot.tags.gridPortal = 'test'
            // globalThis.SetCanvasPositions({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, })
            // globalThis.setHW({ width: `${rect.width}px !important`, height: `${rect.height}px !important` })
            // globalThis.setTL({ left: `${rect.left}px !important`, top: `${rect.top}px !important` })
        }
    }

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <style>
            </style>
            <div
                ref={divRef}
                id="#mainCanvas"
                class="mainCanvas"
                onClick={runTest}
                style={{
                    width: "100%",
                    height: "100%",
                    border: "1px solid black",
                    overflow: "auto",
                }}
            ></div>
        </div>
    );
};
const Main = () => {
    if (configBot.tags.extensions)
        return <PackageManager />
    const { screens, fullScreen, setFullScreen } = useBibleContext()
    const { collapsed, sidebarWidth, setSidebarWidth, themeColors } = useSideBarContext()
    const { tabs, activeSpace, getAllTabsInSpace } = useTabsContext();
    const [started, setStarted] = useState(false)

    const { containerProps, updateContainerSize, updateApplication, removeApplicationByID, replaceApplication, addApplication, resetApps, removeApplication, setApps } = useDivSpliter({
        components: [
            { id: `panel-${0}-${activeSpace}`, App: <ThePageWithEditor panelId={`panel-${0}-${activeSpace}`} tab={tabs[0]} />, to: 'panel' },
            // { id: `panel-${1}-${activeSpace}`, App: <TestingApp panelId={`panel-${1}-${activeSpace}`} />, to: 'panel' },
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
    globalThis.UpdateApplication = updateApplication;
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
    globalThis.LocateCanvas = () => {
        const nodes = document.querySelectorAll(".mainCanvas");
        const el = nodes[nodes.length - 1]; // last match
        if (!el) {
            configBot.tags.gridPortal = null;
            configBot.tags.mapPortal = null;
            return;
        }

        // Viewport-relative bounds:
        const { left, top, width, height } = el.getBoundingClientRect();

        // Get border radius from computed style
        const style = window.getComputedStyle(el);
        const borderRadius = style.borderRadius;
        // or if you need individual corners:
        const borderTopLeft = style.borderTopLeftRadius;
        const borderTopRight = style.borderTopRightRadius;
        const borderBottomLeft = style.borderBottomLeftRadius;
        const borderBottomRight = style.borderBottomRightRadius;

        configBot.tags.gridPortal = 'thePortal';
        globalThis.SetCanvasPositions({
            // ...style,
            left,
            top,
            width,
            height,
            borderRadius, // shorthand
        });
    }

    useEffect(() => {
        globalThis.LocateCanvas()

    }, [screens, containerProps.apps, containerProps.leftWidth, containerProps.topHeight]);

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
        // console.log(newApps)
        setApps(newApps); // ✅ Update all at once
        setTimeout(() => {
            if (tabs.length === 1 && savedScreens === 1) {
                // console.log('testing update now working', tabs[0])
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
        const mob = window.innerWidth < 768
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
        // os.log(themeColors, 'theme colors')
    }, [themeColors])
    useEffect(() => {

        const handleContextMenu = (e) => {
            e.preventDefault(); // Disable right-click
        };

        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);
    const lenght = Object.keys(themeColors || {}).length
    useEffect(() => {
        CheckToolbarOverflow()
        // os.log('resize', CheckToolbarOverflow)
    }, [containerProps.leftWidth, containerProps.topHeight])
    const buildThemeCSS = (themeColors, activeSpace, defaultTheme) => {
        const colors = {
            ...defaultTheme,                  // start with defaults
            ...(themeColors?.[activeSpace] || {}) // overwrite with current themeColors
        };

        const vars = Object.entries(colors).map(
            ([key, value]) => `--${key}: ${value};`
        );

        return `:root {\n  ${vars.join("\n  ")}\n}`;
    };
    const defaultTheme = {
        menuBackground: '#F0F1F1',
        primaryButton: '#E6E6E6',
        primaryButtonColor: '#606060',
        secondaryButton: '#4459F34D',
        secondaryButtonColor: '#4459F3',
        buttonBorder: '#2b00ff',
        tabSelection: '#a5ade2',
        spaceSelection: '#4459F3',
        toolbarBackground: '#ffffff',
        text1: '#606060',
        text2: '#000000',

    };
    return <MouseMoveProvider>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <style>
            {buildThemeCSS(themeColors, activeSpace, defaultTheme)}
        </style>
        <DragDropOverlay />
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