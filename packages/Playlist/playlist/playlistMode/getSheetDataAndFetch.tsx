try {
    const link = that?.link;

    if (!link) {
        return;
    }

    const id = extractIdFromUrl(link);

    const linkToHit = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&fields=name`

    function isValidNumber(str, giveBool = false) {
        // Check if the input is a string and not empty
        if (typeof str !== 'string' || str.trim() === '') {
            return false;
        }

        // Try to convert the string to a number
        const num = Number(str);

        // Check if the conversion resulted in a valid number
        const isValid = !isNaN(num);
        if (giveBool) return isValid;
        return isValid ? num : 1;
    }

    function capitalizeFirstLetter(str) {
        if (typeof str !== 'string' || str.length === 0) {
            return '';
        }

        return str.split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    const ranksOfBooks = globalThis.findNameRank("", "", true);

    const sectionRanks = globalThis.getSectionRanking();

    let { status, data, statusText } = await web.get(linkToHit).catch(this.catchError)
    if (status !== 200)
        return info('Status is different than 200, got', status, 'with status text of', statusText);

    let lines = data.split('\r\n');
    let options = lines.shift();

    const heading = options.split(",").map(head => head.toLocaleLowerCase());

    const dataFinal = []

    lines.forEach(line => {
        const data = line.split(",");
        const objectData = {};
        data.forEach((typeItem, i) => {
            objectData[heading[i]] = typeItem
        });
        dataFinal.push(objectData);
    });

    const booksObject = globalThis.BOOKID_DATA.reduce((acc, book) => {
        acc[book.name.toLowerCase()] = { ...book };
        return acc;
    }, {});

    const dataConvert = [];

    const types = ["verse", "testament", "section", "book", "chapter"];


    dataFinal.forEach(data => {
        const testamentKey = heading.find(ele => ele.startsWith("test"));
        const sectionKey = heading.find(ele => ele.startsWith("sec"));
        const chapterKey = heading.find(ele => ele.startsWith("chap"));
        const verseKey = heading.find(ele => ele.startsWith("ver"));
        const bookKey = heading.find(ele => ele.startsWith("book"));
        let dataType = '';

        const bookOrgKey = data[bookKey].trim();

        const booksMap = thisBot.tags.abbrevations;

        let bookName = !!booksMap[bookOrgKey.toLocaleLowerCase()] ? booksMap[bookOrgKey.toLocaleLowerCase()] : bookOrgKey;

        bookName = capitalizeFirstLetter(bookName);

        const book = bookName.toLocaleLowerCase();


        let tempBookName = false;

        if (book.includes("psalms")) {
            tempBookName = 'psalms';
        }

        let bookData = booksObject[tempBookName || book];

        if (!bookData) return;

        let chapter = data[chapterKey] || 1;

        if (book.includes("psalms")) {
            bookData.commonName = getPsalmsBookName(chapter || 1);
            const psBookData = getPsalmsBookData(chapter || 1);
            bookData = { ...bookData, ...psBookData };
        }

        const bookDetails = findNameRank(bookData.commonName);

        const startChapter = bookData.startChapter || 1;
        const endChapter = (startChapter + (bookData.numberOfChapters || 151) - 1) || 151;

        if (chapter < startChapter || startChapter > endChapter) return;

        if (!!data[verseKey]) {
            dataType = types[0];

            chapter = isValidNumber(chapter);

            const verse = data[verseKey];

            const dataObj = {
                "book": bookData.commonName,
                "bookId": bookData.id,
                "chapter": chapter,
                "viewerId": CurrentViewerID,
            };

            const chapterData = {
                "bookName": bookData.commonName,
                "chapterNo": chapter,
                "id": bookData.id,
                "numberOfChapters": bookData.numberOfChapters,
                "translationId": bookData.translationId
            };

            const additionalInfo = {
                "book": bookData.commonName,
                "chapter": chapter,
                "bookRank": bookDetails.rank,
            };

            const totalVerseInChapter = thisBot.tags.verseChapterBookMap?.[bookData.commonName.toLocaleLowerCase()]?.[chapter];


            if (verse.includes("-")) {
                const [startIdx, endIdx] = verse.split("-");

                if (isValidNumber(startIdx, true) && isValidNumber(endIdx, true)) {
                    const start = isValidNumber(startIdx);
                    const end = isValidNumber(endIdx);
                    for (let i = start; i <= end; i++) {
                        if (i > totalVerseInChapter) return;
                        dataConvert.push({
                            "additionalInfo": {
                                ...additionalInfo,
                                "chapterData": {
                                    ...chapterData
                                },
                                "data": {
                                    "verse": i,
                                    verseNumber: i,
                                    ...dataObj
                                },
                                verse: i,
                            },
                            "content": `${bookData.commonName} ${chapter}:${i}`,
                            "id": createUUID(),
                            "prefix": "",
                            "type": dataType
                        })
                    }
                } else {
                    dataConvert.push({
                        "additionalInfo": {
                            ...additionalInfo,
                            "chapterData": {
                                ...chapterData
                            },
                            "data": {
                                "verse": 1,
                                verseNumber: 1,
                                ...dataObj
                            },
                            verse: 1,
                        },
                        "content": `${bookData.commonName} ${chapter}:${1}`,
                        "id": createUUID(),
                        "prefix": "",
                        "type": dataType
                    })
                }
            } else {
                if (verse > totalVerseInChapter) return;
                if (!isValidNumber(verse)) return;
                dataConvert.push({
                    "additionalInfo": {
                        ...additionalInfo,
                        "chapterData": {
                            ...chapterData
                        },
                        "data": {
                            "verse": verse,
                            verseNumber: verse,
                            ...dataObj
                        },
                        verse: verse,
                    },
                    "content": `${bookData.commonName} ${chapter}:${verse}`,
                    "id": createUUID(),
                    "prefix": "",
                    "type": dataType
                })
            }
            return;
        }

        if (!!data[chapterKey] && !data[verseKey]) {
            dataType = "chapter";
            const chapter = data[chapterKey];


            if (chapter.includes("-")) {
                const [startIdx, endIdx] = chapter.split("-");
                if (isValidNumber(startIdx, true) && isValidNumber(endIdx, true)) {

                    const start = isValidNumber(startIdx);
                    const end = isValidNumber(endIdx);
                    for (let i = start; i <= end; i++) {

                        if (book.includes("psalms")) {
                            bookData.commonName = getPsalmsBookName(i);
                            const psBookData = getPsalmsBookData(i);
                            bookData = { ...bookData, ...psBookData };
                        }

                        const startChapter = bookData.startChapter || 1;
                        const bookDetails = findNameRank(bookData.commonName);

                        if (i > (startChapter + bookData.numberOfChapters - 1)) return;

                        const additionalInfo = {
                            "bookName": bookData.commonName,
                            "bookRank": bookDetails.rank,
                            "chapters": bookData.numberOfChapters,
                        };

                        const dataObj = {
                            "id": bookData.id,
                            "translationId": bookData.translationId,
                            "numberOfChapters": bookData.numberOfChapters,
                            "viewerId": CurrentViewerID,
                        }

                        dataConvert.push({
                            "additionalInfo": {
                                ...additionalInfo,
                                "chapter": i,
                                "data": {
                                    "chapter": i,
                                    ...dataObj
                                },
                            },
                            "content": `${bookData.commonName} ${i}`,
                            "id": createUUID(),
                            "prefix": "",
                            "type": "chapter"
                        })
                    }
                } else {
                    if (book.includes("psalms")) {
                        bookData.commonName = getPsalmsBookName(i);
                        const psBookData = getPsalmsBookData(i);
                        bookData = { ...bookData, ...psBookData };
                    }

                    const startChapter = bookData.startChapter || 1;
                    const bookDetails = findNameRank(bookData.commonName);

                    if (1 > (startChapter + bookData.numberOfChapters - 1)) return;

                    const additionalInfo = {
                        "bookName": bookData.commonName,
                        "bookRank": bookDetails.rank,
                        "chapters": bookData.numberOfChapters,
                    };

                    const dataObj = {
                        "id": bookData.id,
                        "translationId": bookData.translationId,
                        "numberOfChapters": bookData.numberOfChapters,
                        "viewerId": CurrentViewerID,
                    }

                    dataConvert.push({
                        "additionalInfo": {
                            ...additionalInfo,
                            "chapter": 1,
                            "data": {
                                "chapter": 1,
                                ...dataObj
                            },
                        },
                        "content": `${bookData.commonName} ${1}`,
                        "id": createUUID(),
                        "prefix": "",
                        "type": "chapter"
                    })
                }
            } else {
                if (!isValidNumber(chapter)) return;
                if (book.includes("psalms")) {
                    bookData.commonName = getPsalmsBookName(chapter);
                    const psBookData = getPsalmsBookData(chapter);
                    bookData = { ...bookData, ...psBookData };
                }

                const startChapter = bookData.startChapter || 1;
                const bookDetails = findNameRank(bookData.commonName);

                if (chapter > (startChapter + bookData.numberOfChapters - 1)) return;

                const additionalInfo = {
                    "bookName": bookData.commonName,
                    "bookRank": bookDetails.rank,
                    "chapters": bookData.numberOfChapters,
                };

                const dataObj = {
                    "id": bookData.id,
                    "translationId": bookData.translationId,
                    "numberOfChapters": bookData.numberOfChapters,
                    "viewerId": CurrentViewerID,
                };

                dataConvert.push({
                    "additionalInfo": {
                        ...additionalInfo,
                        "chapter": chapter,
                        "data": {
                            "chapter": chapter,
                            ...dataObj
                        },
                    },
                    "content": `${bookData.commonName} ${chapter}`,
                    "id": createUUID(),
                    "prefix": "",
                    "type": "chapter"
                })
            }
            return;
        }

        if (false) {
            return
            const bookRank = ranksOfBooks[bookName].rank;
            dataConvert.push({
                content: bookName,
                id: createUUID(),
                type: "book",
                additionalInfo: {
                    bookName,
                    bookRank
                }
            })
            return;
        }

        const sectionName = (data[sectionKey] || "").toLocaleLowerCase();
        const isValidSection = !!sectionRanks[sectionName]?.testament;

        if (isValidSection) {
            return;
            dataConvert.push({
                content: sectionName,
                id: createUUID(),
                type: "section",
                additionalInfo: {
                    sectionName
                }
            })
            return;
        }

        if (!!data[testamentKey]) {
            const isNewTestament = data[testamentKey].toLocaleLowerCase().includes("new");
            const isOldTestament = data[testamentKey].toLocaleLowerCase().includes("old");

            if (isOldTestament || isNewTestament) {
                return;
                dataConvert.push({
                    content: isOldTestament ? "Old Testament" : "New Testament",
                    id: createUUID(),
                    type: "testament",
                    additionalInfo: {
                        isNewTestament,
                        bookName: isOldTestament ? "Old Testament" : "New Testament",
                    }
                })
            }
        }
    })

    return dataConvert;
} catch (error) {
    const message = error.message === "Network Error" ? "Network Error! Make sure your sheet is public." : (error.message || "Something went wrong!");
    ShowNotification({ message, severity: "error" });
    return null;
}