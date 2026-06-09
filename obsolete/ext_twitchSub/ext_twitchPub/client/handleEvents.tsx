import { joinParts } from "ext_twitchPub.client.utils";

const config = that.config;

switch (config.type) {
  case "bookChanged": {
    if (masks?.chapterFollowEnabled === false) {
      console.log("Chapter follow is disabled, not changing book");
      break;
    }
    const { payload } = config;
    const { bookId, chapter, translation } = JSON.parse(payload);
    console.log("Opening book", bookId, chapter, translation);
    Open(bookId, chapter, translation);
    break;
  }
  case "translationChanged": {
    if (masks?.translationEnabled === false) {
      console.log("Translation change is disabled, not changing translation");
      break;
    }
    const { payload } = config;
    const { translation, baseUrl } = JSON.parse(payload);
    web
      .get(`${baseUrl}/api/${translation}/books.json`)
      .then((e) => {
        ChangeTranslation(translation, e.data.books, baseUrl);
      })
      .catch((e) => {
        console.log(e);
      });
    break;
  }
  case "highlightUpdated": {
    if (masks?.highlightEnabled === false) {
      console.log("Highlighting is disabled, not updating highlights");
      break;
    }
    const { payload, uid, currentPart, parts } = config;
    const fullPayload = joinParts({ payload, uid, currentPart, parts });
    if (!fullPayload) {
      console.log("Waiting for more parts...", {
        payload,
        uid,
        currentPart,
        parts,
      });
      break;
    }
    const { highlightedVerses, unhighlightedVerses } = JSON.parse(fullPayload);
    const highlightKeys = Object.keys(highlightedVerses);
    for (const key of highlightKeys) {
      const [color, bookId, chapter] = key.split("-");
      const verses = highlightedVerses[key];
      const currentBook = JSON.parse(masks?.currentBookData || "{}");
      if (
        currentBook.bookId === bookId &&
        currentBook.chapter == chapter &&
        globalThis?.HighlightVerse
      ) {
        globalThis.HighlightVerse(verses, color);
      }
    }
    for (const key of Object.keys(unhighlightedVerses)) {
      const [, bookId, chapter] = key.split("-");
      const verses = unhighlightedVerses[key];
      const currentBook = JSON.parse(masks?.currentBookData || "{}");
      console.log("Unhighlighting verses for", bookId, chapter, currentBook);
      if (
        currentBook.bookId === bookId &&
        currentBook.chapter == chapter &&
        globalThis?.UnHighlightVerse
      ) {
        globalThis.UnHighlightVerse(verses);
      }
    }
    setTagMask(thisBot, "currentVerseHighlights", fullPayload, "local");
    break;
  }
}
