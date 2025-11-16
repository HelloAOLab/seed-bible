const { book, bookId, chapter } = that;

const contentMap = {
  "EXO-25": [
    9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  ],
  "EXO-26": [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  ],
  "EXO-27": [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  ],
  "EXO-28": [29, 43],
  "EXO-29": [4, 10, 11, 30, 32, 37, 38, 39, 40, 41, 42, 44],
  "EXO-30": [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  ],
  "EXO-35": [
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    24, 25, 26, 27, 28, 29,
  ],
  "EXO-36": [
    1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  ],
  "EXO-37": [
    1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29,
  ],
  "EXO-38": [
    1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29, 30, 31,
  ],
  "EXO-40": [
    1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  ],
};

const content = contentMap[`${bookId}-${chapter}`];

await os.sleep(200);

if (content) {
  const optionsConfig = {};
  const item = {
    icon: <span class="material-symbols-outlined">camping</span>,
    title: `${thisBot.vars.appId ? "Hide" : "Show"} Tabernacle`,
    onClick: thisBot.DisplayApp,
  };
  for (const verseNumber of content) {
    const key = `${book}-${verseNumber}`;
    optionsConfig[key] = {
      icon: <span class="material-symbols-outlined">camping</span>,
      title: "Tabernacle",
      items: [item],
    };
  }

  if (!globalThis?.VerseContextMenuOptions) {
    globalThis.VerseContextMenuOptions = {};
  }

  for (const key in optionsConfig) {
    let options = [];
    const prevOptions = globalThis?.VerseContextMenuOptions?.[key] ?? [];
    options = [...prevOptions, optionsConfig[key]];
    const uniqueOptions = [...new Set(options)];
    globalThis.VerseContextMenuOptions[key] = uniqueOptions;
  }
}
