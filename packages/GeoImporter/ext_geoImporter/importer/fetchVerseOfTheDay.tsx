try {
  const sheetData = await thisBot.fetchSheetData();
  let verse1 = sheetData[Math.floor(Math.random() * sheetData.length - 1)];
  let { data, verse } = await thisBot.getVerse({ verse: verse1[0] });
  if (!verse) {
    return thisBot.fetchVerseOfTheDay();
  }
  return {
    verse: verse,
    data: data,
    book: verse1[0],
  };
} catch {
  const [verseFallback, referFallback] =
    introductionManager.tags.TOP30[8].split("IN~VERSE");
  return {
    verse: verseFallback,
    data: null,
    book: referFallback,
    refer: referFallback,
  };
}
