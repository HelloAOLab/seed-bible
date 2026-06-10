import "./initPostHog";
import { Main } from "../app/main";
import { render } from "preact";

// os.syncConfigBotTagsToURL([
//   "translation",
//   "book",
//   "chapter",
//   "settingsView",
//   "sidebar",
// ]);

// configBot.tags.gridPortal = null;
// configBot.tags.mapPortal = null;

console.log("Starting APP");
render(<Main />, document.body);

// os.hideLoadingScreen();
