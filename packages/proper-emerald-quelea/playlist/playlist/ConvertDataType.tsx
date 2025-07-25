const allItems = [];
let badData = 0;

const booksObject = globalThis.BOOKID_DATA.reduce((acc, book) => {
    acc[book.name.toLowerCase()] = { ...book };
    return acc;
}, {});

that.results?.forEach((item) => {

    let itemType = item.type;

    if (itemType === 'playlist-name') {
        suggestedName = item.content;
        return;
    }

    if (itemType === 'playlist-color') {
        suggestedColor = item.content;
        return;
    }

    if (itemType === 'playlist-icon') {
        suggestedIcon = item.content;
        return;
    }

    if (itemType === 'playlist-description') {
        suggestedDescription = item.content;
        return;
    }

    if (!itemType && item.additionalInfo.type) {
        itemType = 'attachment-link';
        item.type = 'attachment-link';
    }

    if (['youtube', 'iframe', 'heading', "date"].findIndex(ele => ele === itemType) > -1) {
        switch (itemType) {
            case 'youtube':
                {
                    const { isValid, type, videoId } = validateUrl(item.link);
                    allItems.push({
                        "additionalInfo": {
                            isValid,
                            "link": item.link,
                            type,
                            "videoId": videoId
                        },
                        "content": item.content,
                        "id": createUUID(),
                        "type": "attachment-link"
                    });
                }
                break;
            case 'iframe':
                {
                    const { isValid, type } = validateUrl(item.link);
                    allItems.push({
                        "additionalInfo": {
                            isValid,
                            "link": item.link,
                            type
                        },
                        "content": item.content,
                        "id": createUUID(),
                        "type": "attachment-link"
                    });
                }
                break;
            case 'heading':
                allItems.push({
                    "additionalInfo": {
                        "link": "",
                        "isValid": true,
                        "type": "text"
                    },
                    "type": "heading",
                    "content": item.content,
                    "id": createUUID(),
                });
                break;
            case 'date':
                allItems.push({
                    "additionalInfo": { "date": item.date },
                    "content": FORMAT_DATE(item.date || new Date()),
                    "id": createUUID(),
                    "type": "date"
                });
                break;
        }
        // allItems.push(item);
        return;
    }

    if (!item.book || !itemType) {
        console.warn("BAD DATA", item);
        badData++;
        return;
    }

    if (itemType === 'verse' && !item.verse) {
        itemType = 'chapter';
    }

    if (itemType === 'chapter' && !item.chapter) {
        return;
    }


    if (itemType === 'verse') {
        const chapter = item.chapter;
        const totalVerseInChapter = item.totalVerseInChapter;
        if (!Array.isArray(item.verse)) {
            item.verse = [item.verse];
        }

        const book = item.book.toLocaleLowerCase();
        let bookData = booksObject[book];

        if (!bookData) return;

        if (book.includes("psalms")) {
            bookData.commonName = getPsalmsBookName(chapter || 1);
            const psBookData = getPsalmsBookData(chapter || 1);
            bookData = { ...bookData, ...psBookData };
        }

        const bookDetails = findNameRank(bookData.commonName);

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

            const book = item.book.toLocaleLowerCase();
            let bookData = booksObject[book];

            if (!bookData) return;

            if (book.includes("psalms")) {
                bookData.commonName = getPsalmsBookName(chpt || 1);
                const psBookData = getPsalmsBookData(chpt || 1);
                bookData = { ...bookData, ...psBookData };
            }

            const bookDetails = findNameRank(bookData.commonName);

            if (chpt > bookData.numberOfChapters) return;
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
});

return { badData, allItems }