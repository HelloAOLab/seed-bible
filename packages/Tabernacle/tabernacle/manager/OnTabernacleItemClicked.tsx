const { key } = that;

const versesInChapter = [];
const versesInOtherChapters = [];

for (const bookId in thisBot.tags.scriptureData) {
  const chapters = thisBot.tags.scriptureData[bookId];
  for (const chapter in chapters) {
    const verses = chapters[chapter];
    for (const verse in verses) {
      const keys = verses[verse];
      if (keys.includes(key)) {
        const path = { bookId, chapter, verse };
        if (
          bookId === thisBot.vars.currentBookId &&
          Number(chapter) === Number(thisBot.vars.currentChapter)
        ) {
          versesInChapter.push(path);
        } else versesInOtherChapters.push(path);
      }
    }
  }
}

thisBot.HandleTabernacleSectionInteraction({ keys: [key], type: "itemClick" });

thisBot.ToggleContextMenuForPiece({
  key,
  versesInChapter,
  versesInOtherChapters,
});
