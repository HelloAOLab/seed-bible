import { render } from "preact";
import App from "./App";
import type { TwitchPubState } from "./interface";

export function openInterface({ state }: { state: TwitchPubState }) {
  if (!document.getElementById("twitchPub-container")) {
    const container = document.createElement("div");
    container.id = "twitchPub-container";
    container.className = "twitchPub";
    document.body.appendChild(container);
    render(<App state={state} />, container);
  }
}
