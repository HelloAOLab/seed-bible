// await os.unregisterApp('searchBar');
// await os.registerApp('searchBar', thisBot);
// const css = thisBot.tags["App.css"];
// const {useState, useEffect, useMemo, useCallback} = os.appHooks;
// const SearchBar = thisBot.SearchBar();

// const App = () => {
//     const [openSidebar, setOpenSidebar] = useState(false);
//     const [currentExperience, setCurrentExperience] = useState(0);
//     const [showLocationsIcon, setShowLocationsIcon] = useState(false);
//     const [backBtnStack, setBackBtnStatck] = useState([]);

//     const Experience = useMemo(() => {
//         let app_bundle = <></>;
//         switch(currentExperience){
//             case 0:
//                 app_bundle = SearchBar;
//                 break
//             case 2:
//                 app_bundle = thisBot.GeoJSONExperience();
//                 break
//             case 3:
//                 app_bundle = thisBot.GeoJSONExperience();
//                 break
//             default:
//                 app_bundle = getBot('system', 'ext_canvas.eventTool').initInterface();
//                 break
//         }
//         return app_bundle;
//     }, [currentExperience])

//     useEffect(() => {
//         globalThis.setOpenSidebar = setOpenSidebar;
//         globalThis.openSidebar = openSidebar;
//         globalThis.currentExperience = currentExperience;
//         globalThis.setCurrentExperience = setCurrentExperience;
//         globalThis.backBtnStack = backBtnStack;
//         globalThis.setBackBtnStatck = setBackBtnStatck;
//         return () => {
//             globalThis.setOpenSidebar = null;
//             globalThis.openSidebar = null;
//             globalThis.currentExperience = null;
//             globalThis.setCurrentExperience = null;
//             globalThis.backBtnStack = null;
//             globalThis.setBackBtnStatck = null;
//         }
//     }, [openSidebar, currentExperience]);

//     useEffect(() => {
//         if(openSidebar){
//             globalThis.annotInitialized = true;
//             // setOpenSettingsBar && setOpenSettingsBar(false);
//         }else{
//             globalThis.annotInitialized = false;
//         }
//         return () => {
//             globalThis.annotInitialized = false;
//         }
//     }, [openSidebar])

//     const handleBack = useCallback(() => {
//         let tempBackBtnStack = [...backBtnStack];
//         tempBackBtnStack[tempBackBtnStack.length - 1].action();
//         tempBackBtnStack.pop();
//         setBackBtnStatck([...tempBackBtnStack]);
//         os.unregisterApp('mouseCursor');
//     }, [backBtnStack])

//     return <>
//         <style>{css}</style>
//         <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
//         <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
//         {openSidebar && currentExperience !== 0 && <div class={`sidebar-container experience_id-${currentExperience} ${openSidebar ? "open-toggle" : openSidebar === null ? "" : "close-toggle"}`}>
//             <span 
//                 onClick={()=>{ 
//                     shout("playSound",{soundName: "SidebarClose"});
//                     setOpenSidebar(false);
//                 }}
//                 class="borderStyle material-symbols-outlined"
//             >
//                 close
//             </span>
//         </div>}
//         <div
//         id="sidebar-bar"
//         onPointerEnter={(e) => {
//             if (e.currentTarget.id === "sidebar-bar"){
//                 setTagMask(gridPortalBot, "portalZoomable", false);
//             }
//         }}
//         onPointerLeave={(e) => {
//             if (e.currentTarget.id === "sidebar-bar"){
//                setTagMask(gridPortalBot, "portalZoomable", true);
//             }
//         }}
//         class={`${currentExperience === 0 ? "sidebar" : "sidebar-left"} experience_id-${currentExperience} ${openSidebar ? currentExperience === 0 ? "open-sideBar" : "open-sideBar-bySide" : openSidebar === null ? "" : currentExperience === 0 ?  "close-sideBar" : "close-sideBar-bySide"}`}>
//                 <style>
//                 {
//                     `
//                       :root {
//                         --mobileWidth: ${currentExperience === 3?'100%':'200px'};
//                         }
//                     `
//                 }
//             </style>
//             {
//                 Experience && <Experience />
//             }
//         </div>
//     </>
// }

// os.compileApp('searchBar',<App />);