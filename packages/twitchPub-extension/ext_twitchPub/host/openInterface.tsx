import App from "ext_twitchPub.host.App";
const { render } = os.appHooks;

const { state } = that;

if (!document.getElementById("twitchPub-container")) {
  const container = document.createElement("div");
  container.id = "twitchPub-container";
  container.className = "twitchPub";
  document.body.appendChild(container);
  render(<App state={state} />, container);
}
