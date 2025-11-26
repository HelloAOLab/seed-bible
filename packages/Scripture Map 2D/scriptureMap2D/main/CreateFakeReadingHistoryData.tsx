const now = Date.now();
const aYearAgo = new Date(now);
aYearAgo.setFullYear(aYearAgo.getFullYear() - 1);
const startOfWeekAYearAgoDate = GetStartOfWeek(aYearAgo).getTime();
const hooks = getBot("system", "app.hooks");
const tempHistory = (hooks.vars.tempReadingHistory ??= {});
const allBooksNames = Object.keys(BibleVizUtils.Data.tags.booksStaticInfo);

const randomUsersIds = Array.from({ length: GetRandomArbitrary(3, 6) }).map(
  () => uuid()
);
const colorsMap = new Map();

const books = allBooksNames.map((book) => {
  return BibleVizUtils.Data.tags.booksStaticInfo[book];
});

randomUsersIds.forEach((userId) => {
  const userHistory = (tempHistory[userId] ??= {});

  books.forEach(({ abbreviation, numberOfChapters }) => {
    const bookHistory = (userHistory[abbreviation] ??= {});

    const chapters = Array.from({ length: numberOfChapters }).map((_, i) => {
      return i + 1;
    });

    chapters.forEach((chapter) => {
      const chapterHistory = (bookHistory[chapter] ??= []);
      const randomEntriesAmount = GetRandomArbitrary(0, 5);

      for (let i = 0; i < randomEntriesAmount; i++) {
        const start = GetRandomArbitrary(startOfWeekAYearAgoDate, now);
        const end = GetRandomArbitrary(
          start,
          Math.min(now, start + GetRandomArbitrary(0, 1200000))
        );

        chapterHistory.push({ start, end });
      }
    });
  });

  const color = BibleVizUtils.Functions.GetRandomColor();
  colorsMap.set(userId, color);
});

// console.log(`[Debug] CreateFakeReadingHistoryData`, {"hooks.vars.tempReadingHistory": hooks.vars.tempReadingHistory})

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

function GetStartOfWeek(date) {
  const tempDate = new Date(date);
  tempDate.setDate(tempDate.getDate() - tempDate.getDay());
  tempDate.setHours(0, 0, 0, 0);
  return tempDate;
}
