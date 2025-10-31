const MS_PER_DAY = 86400000;
const now = Date.now();
const tenDaysAgo = now - (MS_PER_DAY * 10);
const hooks = getBot("system", "app.hooks");
const tempHistory = hooks.vars.tempReadingHistory ??= {};
const allBooksNames = Object.keys(BibleVizUtils.Data.tags.booksStaticInfo);

const randomUsersIds = Array.from({ length: GetRandomArbitrary(3, 7) }).map(() => uuid());
const colorsMap = new Map();

randomUsersIds.forEach((userId) => {
  const userHistory = tempHistory[userId] ??= {};
  const randomBooksAmount = GetRandomArbitrary(10, 60);
  const randomBooksIndexes = Array.from({ length: allBooksNames.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, randomBooksAmount);

  const randomReadBooks = randomBooksIndexes.map(
    (i) => BibleVizUtils.Data.tags.booksStaticInfo[allBooksNames[i]]
  );

  randomReadBooks.forEach(({ abbreviation, numberOfChapters }) => {
    const bookHistory = userHistory[abbreviation] ??= {};
    const randomChapters = GetRandomUniqueNumbers(1, numberOfChapters, Math.min(numberOfChapters, 10));

    randomChapters.forEach((chapter) => {
      const chapterHistory = bookHistory[chapter] ??= [];
      const randomEntriesAmount = GetRandomArbitrary(1, 15);

      Array.from({ length: randomEntriesAmount }).forEach(() => {
        const start = GetRandomArbitrary(tenDaysAgo, now);
        const end = GetRandomArbitrary(start, Math.min(now, start + GetRandomArbitrary(60000, 1200000)));

        chapterHistory.push({ start, end });
      });
    });
  });

  const color = BibleVizUtils.Functions.GetRandomColor();
  colorsMap.set(userId, color);
});

thisBot.vars.FakeReadingHistoryUsersColorMap = colorsMap;

function GetRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function GetRandomUniqueNumbers(min, max, count) {
  const result = new Set();
  while (result.size < count) {
    result.add(GetRandomArbitrary(min, max));
  }
  return [...result];
}