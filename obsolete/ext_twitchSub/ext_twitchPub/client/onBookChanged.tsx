import { TwitchIcon } from "ext_twitchPub.client.icons";
const { render } = os.appHooks;
if (masks?.WSStarted) {
  let containerToUse: Element | null = null;
  const existingIcon = document.getElementById("twitch-extension-icon");
  if (existingIcon) {
    existingIcon.remove();
  }
  const twitchIconDiv = document.createElement("div");
  twitchIconDiv.id = "twitch-extension-icon";
  twitchIconDiv.style.display = "inline-flex";
  twitchIconDiv.style.alignItems = "center";
  twitchIconDiv.style.justifyContent = "center";
  twitchIconDiv.style.width = "30px";
  twitchIconDiv.style.height = "30px";
  twitchIconDiv.style.marginLeft = "12px";
  twitchIconDiv.style.borderRadius = "50%";
  if (globalThis?.twitchWebsocketClientPaused) {
    twitchIconDiv.style.boxShadow = "0px 1px 14px 0px rgba(0,0,0,0.1)";
  } else {
    twitchIconDiv.style.boxShadow =
      "0px 1px 14px 0px color-mix(in srgb, var(--secondaryColor) 25%, transparent)";
  }
  twitchIconDiv.style.cursor = "pointer";
  twitchIconDiv.style.position = "absolute";

  if (window.innerWidth <= 768) {
    containerToUse =
      document.getElementsByClassName("mobile-header-title")[0] || null;
    twitchIconDiv.style.top = "15px";
  } else {
    containerToUse = document.getElementById("bookTitle") || null;
    twitchIconDiv.style.top = "22px";
  }

  console.log("Container to use for Twitch Icon:", containerToUse);

  twitchIconDiv.onclick = (e) => {
    e.stopPropagation();
    thisBot.toggleInterface();
  };

  if (containerToUse) {
    containerToUse.appendChild(twitchIconDiv);
    render(<TwitchIcon width={20} height={20} />, twitchIconDiv);
  }
}
const currentBookData = { ...that };
setTagMask(
  thisBot,
  "currentBookData",
  JSON.stringify(currentBookData),
  "local"
);

if (masks?.WSStarted && masks?.currentVerseHighlights) {
  const { highlightedVerses, unhighlightedVerses } = JSON.parse(
    masks.currentVerseHighlights
  );
  console.log(
    "Updating verse highlights",
    highlightedVerses,
    unhighlightedVerses
  );
  const highlightKeys = Object.keys(highlightedVerses);
  for (const key of highlightKeys) {
    const [color, book, chapter] = key.split("-");
    const verses = highlightedVerses[key];
    const currentBook = JSON.parse(masks?.currentBookData || "{}");
    if (
      currentBook.book === book &&
      currentBook.chapter == chapter &&
      globalThis?.HighlightVerse
    ) {
      globalThis.HighlightVerse(verses, color);
    }
  }
  for (const key of Object.keys(unhighlightedVerses)) {
    const [book, chapter] = key.split("-");
    const verses = unhighlightedVerses[key];
    const currentBook = JSON.parse(masks?.currentBookData || "{}");
    if (
      currentBook.book === book &&
      currentBook.chapter == chapter &&
      globalThis?.UnHighlightVerse
    ) {
      globalThis.UnHighlightVerse(verses);
    }
  }
}
