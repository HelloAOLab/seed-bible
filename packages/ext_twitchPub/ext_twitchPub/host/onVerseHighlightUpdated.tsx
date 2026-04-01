console.log("updated verse highlights", that);

interface HighlightedVerse {
  book: string;
  chapter: number;
  color: string;
  verseNumber: number;
}

const sortByColorAndBook = (verses: HighlightedVerse[]) => {
  const sortedVerses: { [key: string]: number[] } = {};
  for (const verse of verses) {
    const key = `${verse.color}-${verse.book}-${verse.chapter}`;
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

if (masks?.uiLoaded && masks?.highlightEnabled) {
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
  const uid = uuid().slice(0, 5);

  if (payload.length > 350) {
    const parts = Math.ceil(payload.length / 350);
    for (let i = 0; i < parts; i++) {
      const partPayload = payload.slice(i * 350, (i + 1) * 350);
      setTimeout(() => {
        whisper(thisBot, "sendMessage", {
          message: JSON.stringify({
            type: "highlightUpdated",
            payload: partPayload,
            parts,
            currentPart: i + 1,
            uid,
          }),
        });
      }, i * 200);
    }
  } else {
    whisper(thisBot, "sendMessage", {
      message: JSON.stringify({
        type: "highlightUpdated",
        payload,
        parts: 0,
        currentPart: 0,
        uid,
      }),
    });
  }
}
