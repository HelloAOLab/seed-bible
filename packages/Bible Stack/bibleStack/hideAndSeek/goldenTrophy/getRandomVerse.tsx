const verseData = thisBot.tags.bibleVerse;
const bookName = that?.bookName;
const preDefinedIdex = that?.preDefinedIdex;

// Get random book
const books = Object.keys(verseData);
const selectedBook = bookName ? bookName : books[Math.floor(Math.random() * books.length)];
// Get random verse from the selected book
const verses = verseData[selectedBook];
const selectedVerse = preDefinedIdex ? verses[preDefinedIdex - 1]  :verses[Math.floor(Math.random() * verses.length)];

const {verse , refer} = thisBot.splitVerserAndReference({verse: selectedVerse, bookName: selectedBook});

return { refer, verse , selectedBook};