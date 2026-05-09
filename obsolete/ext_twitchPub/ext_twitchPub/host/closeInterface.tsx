const { render } = os.appHooks;

const twitchPubContainer = document.getElementById("twitchPub-container");

if (twitchPubContainer) {
  render(null, twitchPubContainer);
  twitchPubContainer.remove();
  setTagMask(thisBot, "uiLoaded", false, "local");
}
