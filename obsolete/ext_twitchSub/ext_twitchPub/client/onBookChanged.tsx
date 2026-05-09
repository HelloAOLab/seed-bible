const currentBookData = { ...that };
setTagMask(
  thisBot,
  "currentBookData",
  JSON.stringify(currentBookData),
  "local"
);

if (masks?.uiLoaded && masks?.currentVerseHighlights) {
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
