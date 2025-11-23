const { book, bookId, chapter } = that;

const verses = thisBot.tags.scriptureData[bookId]?.[chapter];

await os.sleep(200);

if (verses) {
  const optionsConfig = {};
  for (const verse in verses) {
    const keys = verses[verse];
    const items = [];
    for (const key of keys) {
      const item = {
        title: thisBot.GetFixedTitle(key),
        onClick: () => {
          thisBot.OnTabernacleSectionClick({ keys: [key] });
        },
      };
      items.push(item);
    }
    const key = `${book}-${verse}`;
    optionsConfig[key] = {
      icon: <span class="material-symbols-outlined">camping</span>,
      title: "Tabernacle",
      items,
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
