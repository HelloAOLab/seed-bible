import { render } from "preact";
import App from "./App";
import type { TwitchPubState } from "./interface";
import type { SeedBibleState } from "seed-bible";

export function openInterface({
  state,
  context,
}: {
  state: TwitchPubState;
  context: SeedBibleState;
}) {
  if (!document.getElementById("twitchPub-container")) {
    const container = document.createElement("div");
    container.id = "twitchPub-container";
    container.className = "twitchPub";
    document.body.appendChild(container);
    render(<App state={state} i18n={context.i18n} />, container);
  }
}
