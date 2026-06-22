import "./initPostHog";
import { Main } from "../app/main";
import { render } from "preact";
import { readInjectedConfig } from "../app/appConfig";
import { createSeedBibleState } from "../managers/SeedBibleStateManager";

// Config (base path + asset host) injected by the host server. Reading it on
// the client ensures we mount with the same config the server rendered with,
// avoiding hydration mismatches.
const config = readInjectedConfig();

const container = document.getElementById("app") ?? document.body;

console.log("Starting APP");

// Create the app state up front so we can wait for the detected language's
// translations (now fetched lazily) to load before the first render. This keeps
// the initial paint on the correct-language SSR markup instead of flashing the
// bundled "en" fallback. We `render` rather than `hydrate` (TODO: support
// hydration), so the server markup is replaced once this resolves.
const state = createSeedBibleState({ config });

void state.i18n.ready.then(() => {
  render(<Main initialState={state} config={config} />, container);
});
