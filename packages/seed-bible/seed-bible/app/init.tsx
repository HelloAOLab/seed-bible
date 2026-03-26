import { Main } from "seed-bible.app.main";

const { render } = os.appHooks;

// const importMap = document.createElement('script');
// importMap.type = 'importmap';
// importMap.textContent = JSON.stringify({
//   imports: {
//     "preact": "https://esm.sh/preact@10.28.4",
//     "@preact/signals": "https://esm.sh/@preact/signals?deps=preact@10.28.4?externals=preact",
//   },
// });
// document.head.appendChild(importMap);

os.syncConfigBotTagsToURL(["translation", "book", "chapter"]);

configBot.tags.gridPortal = null;
configBot.tags.mapPortal = null;

console.log("Starting APP");
render(<Main />, document.body);

os.hideLoadingScreen();
