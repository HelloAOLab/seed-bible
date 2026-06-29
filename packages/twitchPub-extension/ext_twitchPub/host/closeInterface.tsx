import { render } from "preact";

export function closeInterface() {
  const container = document.getElementById("twitchPub-container");
  if (container) {
    render(null, container);
    container.remove();
  }
}
