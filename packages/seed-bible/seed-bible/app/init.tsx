import "./initPostHog";
import { Main } from "../app/main";
import { hydrate, render } from "preact";
import { readInjectedConfig } from "../app/appConfig";

// Config (base path + asset host) injected by the host server. Reading it on
// the client ensures we mount with the same config the server rendered with,
// avoiding hydration mismatches.
const config = readInjectedConfig();

const container = document.getElementById("app") ?? document.body;

console.log("Starting APP");

// When the host server pre-rendered the app into #app, hydrate to reuse the
// server markup. In dev (or any non-SSR serve) the container is empty, so do
// a fresh client render instead.
if (container.firstChild) {
  // TODO: Support hydration
  //   render(<Main config={config} />, container);
} else {
  render(<Main config={config} />, container);
}
