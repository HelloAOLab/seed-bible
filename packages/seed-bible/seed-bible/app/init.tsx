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

console.log("Starting APP");
render(<Main />, document.body);
