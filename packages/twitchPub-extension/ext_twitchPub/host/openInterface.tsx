import App from "ext_twitchPub.host.App";
const { render } = os.appHooks;

const { state } = that;

const twitchPubContainer = document.getElementById("twitchPub-container");

if (!twitchPubContainer) {
  const twitchPubDiv = document.createElement("div");

  twitchPubDiv.id = "twitchPub-container";

  twitchPubDiv.className = "twitchPub";

  document.body.appendChild(twitchPubDiv);

  const container = document.getElementById("twitchPub-container");
  if (container) {
    render(<App state={state} />, container);
  }
}
