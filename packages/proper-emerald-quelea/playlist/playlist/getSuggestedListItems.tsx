const results = thisBot.checkAndGetlinkData({ fileName: that.searchText });

const booksObject = globalThis.BOOKID_DATA.reduce((acc, book) => {
    acc[book.name.toLowerCase()] = { ...book };
    return acc;
}, {});


const allItems = [];
results.forEach((item) => {

    const book = item.book.toLocaleLowerCase();
    let bookData = booksObject[book];
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
    const endChapter = (startChapter + (bookData.numberOfChapters || 151) - 1) || 151;

    if (chapter < startChapter || startChapter > endChapter) return;

    if (itemType === 'verse') {
        const chapter = item.chapter;
        const totalVerseInChapter = item.totalVerseInChapter;
        if (!Array.isArray(item.verse)) {
            item.verse = [item.verse];
        }
        item.verse.forEach(vrs => {
            if (vrs > totalVerseInChapter) return;
            const newItem = {
                "additionalInfo": {
                    "book": bookData.commonName,
                    "chapter": chapter,
                    "bookRank": bookDetails.rank,
                    "chapterData": {
                        "bookName": bookData.commonName,
                        "chapterNo": chapter,
                        "id": bookData.id,
                        "numberOfChapters": bookData.numberOfChapters,
                        "translationId": bookData.translationId
                    },
                    "data": {
                        "book": bookData.commonName,
                        "bookId": bookData.id,
                        "chapter": chapter,
                        "viewerId": CurrentViewerID,
                        "verse": vrs,
                        verseNumber: vrs
                    },
                    verse: vrs,
                },

                "content": `${bookData.commonName} ${chapter}:${vrs}`,
                "id": createUUID(),
                "prefix": "",
                "type": "verse"
            }
            allItems.push(newItem);
        })
    }
    if (itemType === 'chapter' || itemType === "book") {
        if (!Array.isArray(item.chapter)) {
            item.chapter = [item.chapter || 1];
        }
        item.chapter.forEach(chpt => {

            if (book.includes("psalms")) {
                bookData.commonName = getPsalmsBookName(chpt || 1);
                const psBookData = getPsalmsBookData(chpt || 1);
                bookData = { ...bookData, ...psBookData };
            }

            const startChapter = bookData.startChapter || 1;
            const bookDetails = findNameRank(bookData.commonName);

            if (chpt > (startChapter + bookData.numberOfChapters - 1)) return;


            const newItem = {
                "additionalInfo": {
                    "bookName": bookData.commonName,
                    "bookRank": bookDetails.rank,
                    "chapter": chpt,
                    "chapters": bookData.numberOfChapters,
                    "data": {
                        "id": bookData.id,
                        "translationId": bookData.translationId,
                        "numberOfChapters": bookData.numberOfChapters,
                        "chapter": chpt,
                        "viewerId": CurrentViewerID,
                    },
                },
                "content": `${bookData.commonName} ${chpt}`,
                "id": createUUID(),
                "prefix": "",
                "type": "chapter"
            }
            allItems.push(newItem);
        })
    }
})

return allItems;