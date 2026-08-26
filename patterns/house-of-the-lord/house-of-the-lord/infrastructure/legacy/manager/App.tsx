// const { useEffect } = os.appHooks;

// import { useMouseMove } from "app.hooks.mouseMove";
// import { useBibleContext } from "app.hooks.bibleVariables";

// const App = () => {
//   const { floatingApps } = useMouseMove();
//   const { scrollToVerse } = useBibleContext();

//   useEffect(() => {
//     thisBot.vars.floatingApps = floatingApps;
//   }, [floatingApps]);

//   useEffect(() => {
//     globalThis.TabernacleScrollToVerse = scrollToVerse;
//     return () => {
//       globalThis.TabernacleScrollToVerse = null;
//     };
//   }, [scrollToVerse]);

//   return (
//     <div style={{ width: "100%", height: "100%" }}>
//       <div
//         className="mainCanvas"
//         style={{
//           width: "100%",
//           height: "100%",
//           border: "1px solid black",
//           overflow: "auto",
//         }}
//       ></div>
//     </div>
//   );
// };

// return App;
