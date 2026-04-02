import { joinParts } from "ext_twitchPub.client.utils";

const config = that.config;

switch (config.type) {
  case "bookChanged": {
    const { payload } = config;
    const { bookId, chapter, translation } = JSON.parse(payload);
    console.log("Opening book", bookId, chapter, translation);
    Open(bookId, chapter, translation);
    break;
  }
  case "translationChanged": {
    const { payload } = config;
    const { translation, baseUrl } = JSON.parse(payload);
    console.log(
      "Changing translation to",
      translation,
      "with base URL",
      baseUrl
    );
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
    setTagMask(thisBot, "currentVerseHighlights", fullPayload, "local");
    break;
  }
}
