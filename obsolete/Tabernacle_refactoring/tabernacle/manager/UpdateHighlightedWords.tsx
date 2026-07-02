// if (!globalThis.HighlightWords) return;

// await os.sleep(200);

// HighlightWords({
//   words: ["tabernacle", "Tabernacle"],
//   color: "#000", // text color
//   backgroundColor: "#fff", // highlight color
//   createAttributes: (book, chapter, verse) => {
//     return {
//       onMouseEnter: async (e) => {
//         e.target.style.color = "#FFD700";
//         e.target.style.fontWeight = "400";
//       },
//       onMouseLeave: async (e) => {
//         // setTimeout(() => {
//         e.target.style.color = "";
//         e.target.style.fontWeight = "";
//         e.target.style.fontStyle = "";
//         // }, 2000)
//       },
//       onContextMenu: async (e) => {
//         e.stopPropagation();
//         e.preventDefault();
//         console.log(book, chapter, verse);
//         shout("onVeresRightClick", {
//           verseNumber: verse.verseNumber,
//           text: verse.text,
//           chapter,
//           book,
//           highlighted: true,
//           extraContext: [
//             {
//               address: "Tabernacle",
//               label: "Tabernacle",
//               items: [
//                 {
//                   icon: (
//                     <span class="material-symbols-outlined">folded_hands</span>
//                   ),
//                   title: () => {
//                     return `${thisBot.vars.appId ? "Hide" : "Show"} Tabernacle`;
//                   },
//                   onClick: async () => {
//                     thisBot.DisplayApp();
//                   },
//                 },
//               ],
//             },
//           ],
//         });
//       },
//       style: () => {
//         return {
//           backgroundColor: "transparent",
//         };
//       },
//     };
//   },
// });
