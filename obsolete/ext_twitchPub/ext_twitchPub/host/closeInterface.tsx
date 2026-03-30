const twitchPubContainer = document.getElementById("twitchPub-container");

if (twitchPubContainer) {
  twitchPubContainer.remove();
  setTagMask(thisBot, "uiLoaded", false, "local");
}
