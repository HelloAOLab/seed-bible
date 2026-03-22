const results = thisBot.checkAndGetlinkData({ fileName: that.searchText });
const G = globalThis as any;
const booksObject = G.BOOKID_DATA.reduce((acc: any, book: any) => {
  acc[book.name.toLowerCase()] = { ...book };
  return acc;
}, {});

const allItems = [];
results.forEach((item: any) => {
  const book: string = item.book.toLocaleLowerCase();
  let bookData: any = booksObject[book];
  const itemType = item.type;

  if (book.includes("psalms")) {
    bookData.commonName = getPsalmsBookName(item.chapter || 1);
    const psBookData = getPsalmsBookData(item.chapter || 1);
    bookData = { ...bookData, ...psBookData };
  }

  const bookDetails = findNameRank(bookData.commonName);

  if (!bookData) return;

  const chapter = item.chapter || 1;

  const startChapter = bookData.startChapter || 1;
  const endChapter =
    startChapter + (bookData.numberOfChapters || 151) - 1 || 151;

  if (chapter < startChapter || startChapter > endChapter) return;

  if (itemType === "verse") {
    const chapter = item.chapter;
    const totalVerseInChapter = item.totalVerseInChapter;
    if (!Array.isArray(item.verse)) {
      item.verse = [item.verse];
    }
    const groupID = G.createUUID();

    item.verse = item.verse.filter((ele: number) => ele <= totalVerseInChapter);

    if (!item?.verse?.length) return;

    if (item.verse.length === 1) {
      const newItem = {
        additionalInfo: {
          book: bookData.commonName,
          chapter: chapter,
          bookRank: bookDetails.rank,
          chapterData: {
            bookName: bookData.commonName,
            chapterNo: chapter,
            id: bookData.id,
            numberOfChapters: bookData.numberOfChapters,
            translationId: bookData.translationId,
          },
          data: {
            book: bookData.commonName,
            bookId: bookData.id,
            chapter: chapter,
            viewerId: G.CurrentViewerID,
            verse: item.verse[0],
            verseNumber: item.verse[0],
          },
          bookId: bookData.id,
          verse: item.verse[0],
          groupID,
        },

        content: `${bookData.commonName} ${chapter}:${item.verse[0]}`,
        id: G.createUUID(),
        prefix: "",
        type: "verse",
      };
      allItems.push(newItem);
    } else {
      const newItem = {
        additionalInfo: {
          book: bookData.commonName,
          chapter: chapter,
          bookRank: bookDetails.rank,
          chapterData: {
            bookName: bookData.commonName,
            chapterNo: chapter,
            id: bookData.id,
            numberOfChapters: bookData.numberOfChapters,
            translationId: bookData.translationId,
          },
          data: {
            book: bookData.commonName,
            bookId: bookData.id,
            chapter: chapter,
            viewerId: G.CurrentViewerID,
            verse: item.verse,
            verseNumber: item.verse,
          },
          bookId: bookData.id,
          verse: item.verse,
          groupID,
        },
        content: `${bookData.commonName} ${chapter}:${item.verse[0]}-${item.verse[item.verse.length - 1]}`,
        id: G.createUUID(),
        prefix: "",
        type: "verse-grouped",
      };
      allItems.push(newItem);
    }
  }
  if (itemType === "chapter" || itemType === "book") {
    if (!Array.isArray(item.chapter)) {
      item.chapter = [item.chapter || 1];
    }

    if (item.chapter.length === 1) {
      const chpt = item.chapter[0];

      if (book.includes("psalms")) {
        bookData.commonName = getPsalmsBookName(chpt || 1);
        const psBookData = getPsalmsBookData(chpt || 1);
        bookData = { ...bookData, ...psBookData };
      }

      const startChapter = bookData.startChapter || 1;
      const bookDetails = findNameRank(bookData.commonName);

      if (chpt > startChapter + bookData.numberOfChapters - 1) return;

      const newItem = {
        additionalInfo: {
          bookName: bookData.commonName,
          bookRank: bookDetails.rank,
          chapter: chpt,
          chapters: bookData.numberOfChapters,
          data: {
            id: bookData.id,
            translationId: bookData.translationId,
            numberOfChapters: bookData.numberOfChapters,
            chapter: chpt,
            viewerId: G.CurrentViewerID,
          },
        },
        content: `${bookData.commonName} ${chpt}`,
        id: G.createUUID(),
        prefix: "",
        type: "chapter",
      };
      allItems.push(newItem);
    } else {
      const books: any = {};

      item.chapter.forEach((chpt: number) => {
        if (book.includes("psalms")) {
          bookData.commonName = getPsalmsBookName(chpt || 1);
          const psBookData = getPsalmsBookData(chpt || 1);
          bookData = { ...bookData, ...psBookData };
        }

        const startChapter = bookData.startChapter || 1;
        const bookDetails = findNameRank(bookData.commonName);

        if (chpt > startChapter + bookData.numberOfChapters - 1) return;
        if (books[bookData.commonName]) {
          if (books[bookData.commonName].type === "chapter") {
            books[bookData.commonName].additionalInfo.chapter = [
              books[bookData.commonName].additionalInfo.chapter,
              chpt,
            ];
            books[bookData.commonName].type = "chapter-grouped";
          } else {
            books[bookData.commonName].additionalInfo.chapter.push(chpt);
          }
        } else {
          books[bookData.commonName] = {
            additionalInfo: {
              bookName: bookData.commonName,
              bookRank: bookDetails.rank,
              chapter: chpt,
              chapters: bookData.numberOfChapters,
              data: {
                id: bookData.id,
                translationId: bookData.translationId,
                numberOfChapters: bookData.numberOfChapters,
                chapter: chpt,
                viewerId: G.CurrentViewerID,
              },
            },
            content: `${bookData.commonName} ${chpt}`,
            id: G.createUUID(),
            prefix: "",
            type: "chapter",
          };
        }
      });

      Object.keys(books).forEach((book) => {
        const item = books[book];
        const content =
          item.type === "chapter-grouped"
            ? `${item.additionalInfo.bookName} ${item.additionalInfo.chapter[0]}-${item.additionalInfo.chapter[item.additionalInfo.chapter.length - 1]}`
            : item.content;
        allItems.push({
          ...item,
          content,
        });
      });
    }
  }
});

return allItems;
