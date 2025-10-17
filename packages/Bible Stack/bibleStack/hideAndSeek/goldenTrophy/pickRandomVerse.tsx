const bibleVerses = thisBot.tags.bibleVerse[thisBot.tags.gameData.bookName];

// Generate a random index within the range of the array length
const randomIndex = Math.floor(Math.random() * bibleVerses.length);

// Return the verse at the random index

return bibleVerses[randomIndex];
