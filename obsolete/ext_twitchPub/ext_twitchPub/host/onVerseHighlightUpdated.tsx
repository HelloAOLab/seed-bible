interface HighlightedVerse {
  book: string;
  bookId: string;
  chapter: number;
  color: string;
  verseNumber: number;
}

const sortByColorAndBook = (verses: HighlightedVerse[]) => {
  const sortedVerses: { [key: string]: number[] } = {};
  for (const verse of verses) {
    const key = `${verse.color}-${verse.bookId}-${verse.chapter}`;
    if (!sortedVerses[key]) {
      sortedVerses[key] = [];
    }
    sortedVerses[key].push(verse.verseNumber);
  }
  return sortedVerses;
};

const getUnhighlightedVerses = (
  current: HighlightedVerse[],
  previous: HighlightedVerse[]
): HighlightedVerse[] => {
  const unhighlighted = [];
  for (const verse of previous) {
    if (
      !current.find(
        (v) =>
          v.book === verse.book &&
          v.chapter === verse.chapter &&
          v.verseNumber === verse.verseNumber
      )
    ) {
      unhighlighted.push(verse);
    }
  }
  return unhighlighted;
};

if (
  masks?.uiLoaded &&
  masks?.highlightEnabled &&
  globalThis?.sendMessageWithRateLimit
) {
  const highlightedVerses: HighlightedVerse[] = Object.values(
    that.highlightedVerses
  );
  const unhighlightedVerses = getUnhighlightedVerses(
    highlightedVerses,
    JSON.parse(masks?.currentVerseHighlights || "[]")
  );
  setTagMask(
    thisBot,
    "currentVerseHighlights",
    JSON.stringify(highlightedVerses),
    "local"
  );

  const payload = JSON.stringify({
    highlightedVerses: sortByColorAndBook(highlightedVerses),
    unhighlightedVerses: sortByColorAndBook(unhighlightedVerses),
  });

  globalThis.sendMessageWithRateLimit("highlightUpdated", payload);
}
