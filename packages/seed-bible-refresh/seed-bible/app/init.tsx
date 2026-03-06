import { Main } from "seed-bible.app.main";

configBot.tags.gridPortal = null;

console.log("Starting APP");
os.appHooks.render(<Main />, document.body);

os.hideLoadingScreen();
