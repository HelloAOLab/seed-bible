import App from "ext_twitchPub.client.App";
const { render } = os.appHooks;

if (!masks?.WSStarted) {
  console.error(
    "WebSocket is not started. Cannot run the Twitch Sub extension."
  );
  os.toast(
    "WebSocket connection is not established. Please check your configuration and try again."
  );
} else {
  const twitchSubContainer = document.getElementById("twitchSub-container");

  if (twitchSubContainer) {
    render(null, twitchSubContainer);
    twitchSubContainer.remove();
    setTagMask(thisBot, "uiLoaded", false, "local");
  } else {
    const twitchSubDiv = document.createElement("div");

    twitchSubDiv.id = "twitchSub-container";

    twitchSubDiv.className = "twitchSub";

    document.body.appendChild(twitchSubDiv);

    const container = document.getElementById("twitchSub-container");
    if (container) {
      render(<App />, container);
    }
    setTagMask(thisBot, "uiLoaded", true, "local");
  }
}
