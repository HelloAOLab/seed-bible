// StacksManager.SpawnBookAndEjectChapter({bookName, chapterNumber});

const {bookName, chapterNumber} = that;
const {book, bookData} = await thisBot.SpawnBook({name: bookName});
await thisBot.SelectBook({book, setBibleAnimating: false});
await thisBot.EjectChapter({bookData, chapterNumber});