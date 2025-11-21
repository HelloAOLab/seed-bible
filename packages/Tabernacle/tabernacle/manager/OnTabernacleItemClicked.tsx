const { key } = that;

const verses = [];
const bookId = thisBot.vars.currentBookId;
const chapter = thisBot.vars.currentChapter;

const versesData = thisBot.tags.scriptureData?.[bookId]?.[chapter] ?? [];

for (const verse in versesData) {
  const keys = versesData[verse];
  const isKeyMentionedInVerse = keys.some((currKey) => currKey === key);
  if (isKeyMentionedInVerse) {
    verses.push(verse);
  }
}

thisBot.HandleTabernacleSectionInteraction({ keys: [key], type: "itemClick" });
