const initialValue = globalThis.HISTORYExploreMode;
globalThis.HISTORYExploreMode = true;
const { dataItem, bulkAdd } = that;

let dataToNavigate = dataItem;
if (Array.isArray(dataItem)) {
    dataToNavigate = dataItem[0];
}

const openTestamentByBook = async (bookName, isFindByRank = false) => {
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);
    const bookDetails = globalThis.findNameRank(bookName, null, false, isFindByRank);
    const bookTestament = bookDetails?.testament === "Old Testament" ? mainWordBibleOldTestament : mainWordBibleNewTestament;
    if (bookTestament) {
        bookTestament.convertIntoArrangement();
        await os.sleep(4000);
    }
    return bookDetails;
}

const openTestamentBySection = async (sectionName, isFindByRank = false) => {
    const sectionRanks = getSectionRanking();
    let section;
    Object.keys(sectionRanks).forEach((key) => {
        if (isFindByRank) {
            const curreSec = sectionRanks[key];
            if (sectionName === curreSec.sectionRank) {
                section = curreSec;
            }
        } else {
            if (key.toLocaleLowerCase() === sectionName.toLocaleLowerCase()) {
                section = sectionRanks[key];
            }
        }
    })
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);

    const bookTestament = section?.testament === "Old Testament" ? mainWordBibleOldTestament : mainWordBibleNewTestament;
    if (bookTestament) {
        bookTestament.convertIntoArrangement();
        await os.sleep(4000);
    }
}

const openSection = async (sectionName) => {
    let sectionBot = getBot(byTag("isSection", true), byTag('sectionName', sectionName));

    if (sectionBot && !sectionBot.masks.selected) {
        // Double time is for interaction and select
        await sectionBot.interact({ notATour: true });
        await sectionBot.interact({ notATour: true });
    } else {
        os.toast(`${sectionName} is Already opened.`);
    }
}

const openBook = async (commonName, chapter = 1, verse = []) => {
    let bookBot = getBot(byTag("bookName", commonName), byTag("isBook", true));
    if (bookBot) {
        await os.focusOn(bookBot, {
            duration: 1,
            easing: "quadratic",
        }).then(async () => {
            await openBookHelper(bookBot, commonName, chapter, verse);
        })
    }
}

async function openBookHelper(bookBot, commonName, chapter, versesState = [1]) {
    shout('closeFormMenu');
    Playlist.tryAddDataToHistory({ dataItem });
    if (bookBot.masks.isSelected) {
        bible.openAt(`${bookBot.tags.bookName} ${chapter}:1`);
        await os.sleep(100);
        updateCustomHeight(0.8);
        globalThis.arrowActionsFreeze = false;
    } else {
        setTagMask(bookBot, "searchSelect", { commonName: commonName, chapter: chapter }, "tempLocal");
        await bookBot.interact().then(async () => {
            if (!bookBot.masks.isSelected) {
                setTagMask(bookBot, "searchSelect", { commonName: commonName, chapter: chapter }, "tempLocal");
                await bookBot.interact().then(async () => {
                    if (!bookBot.masks.isSelected) {
                        setTagMask(bookBot, "searchSelect", { commonName: commonName, chapter: chapter }, "tempLocal");
                        await bookBot.interact();
                    }
                });
            }
        });
        globalThis.arrowActionsFreeze = false;
    }
    try {
        setVersesState(versesState);
    } catch {
        os.log('setVersesState not global yet');
    }
}

switch (dataToNavigate.type) {
    case "testament": {
        const mainWordBibleOldTestament = getBot("isOldTestament", true);
        const mainWordBibleNewTestament = getBot("isNewTestament", true);
        const bot = dataToNavigate.additionalInfo.isNewTestament ? mainWordBibleNewTestament : mainWordBibleOldTestament;
        if (bot) {
            await bot.convertIntoArrangement();
        } else {
            os.toast(`${dataToNavigate.additionalInfo.bookName} is Already opened.`);
        }
        globalThis.ModifyTransformedHistory && globalThis.PlayingPlaylist && globalThis.ModifyTransformedHistory(thh => thisBot.checkGreyOut(thh));
        if (globalThis.updateCustomHeight) updateCustomHeight(0);
        break;
    }
    case "section": {
        await openTestamentBySection(dataToNavigate.additionalInfo.sectionName);
        await openSection(dataToNavigate.additionalInfo.sectionName);
        globalThis.ModifyTransformedHistory && globalThis.PlayingPlaylist && globalThis.ModifyTransformedHistory(thh => thisBot.checkGreyOut(thh));
        if (globalThis.updateCustomHeight) updateCustomHeight(0);
        break;
    }
    case "book": {
        // const bookDetails = await openTestamentByBook(dataToNavigate.additionalInfo.bookRank, true);
        // await openSection(bookDetails.section);
        // await openBook(dataToNavigate.additionalInfo.bookName);
        let book = dataToNavigate.additionalInfo.bookName;
        const chapter = 1;
        // const psalmsDivision = [0, 41 , 72, 89, 106, 150];

        if (book === "Psalms" || book === "Psalm") {
            book = getPsalmsBookName(chapter);
        }

        globalThis.SetSelected && SetSelected({});
        SetHolded({});

        await os.sleep(10);

        globalThis.Open(dataToNavigate.additionalInfo.data.bookId, 1, dataToNavigate.translationId);
        break;
    }
    case "chapter": {

        let book = dataToNavigate.additionalInfo.bookName;
        const chapter = dataToNavigate.additionalInfo.chapter;
        // const psalmsDivision = [0, 41 , 72, 89, 106, 150];

        if (book === "Psalms" || book === "Psalm") {
            book = getPsalmsBookName(chapter);
        }

        globalThis.SetSelected && SetSelected({});
        SetHolded({});

        await os.sleep(10);

        globalThis.Open((dataToNavigate.additionalInfo.data.bookId || dataToNavigate.additionalInfo.data.id), chapter, dataToNavigate.translationId);

        // const bookDetails = await openTestamentByBook(book);
        // await openSection(bookDetails.section);
        // await openBook(book, dataToNavigate.additionalInfo.chapter);
        break;
    }
    case "verse": {
        let bookName = dataToNavigate.additionalInfo.book;
        const chapterNo = dataToNavigate.additionalInfo.chapter;
        const verseData = dataToNavigate.additionalInfo.data;

        const { book, chapter, bookId, sectionData, viewer, highlight, ...verse } = verseData;

        if (book === "Psalms" || book === "Psalm") {
            book = getPsalmsBookName(chapter);
        }

        // const bookDetails = await openTestamentByBook(book);

        globalThis.SetSelectedVerses && SetSelectedVerses([]);
        SetHolded({});
        if (globalThis.CloseNewList) CloseNewList();
        await globalThis.Open(((dataToNavigate.additionalInfo.data.bookId || dataToNavigate.additionalInfo.chapterData.id)), chapterNo, dataToNavigate.translationId);
        await os.sleep(20);

        const versesNumber = [];
        const multiVerse = {};
        let vNumber = -2;
        if (!bulkAdd) {
            versesNumber.push(dataToNavigate.additionalInfo.verse);
            // shout("newList", { chapter: chapter, verse, book, bookId, viewer, highlight, setMid: true });
            vNumber = dataToNavigate.additionalInfo.verse;
            multiVerse[dataToNavigate.additionalInfo.verse] = true;
        } else {
            dataItem.forEach(data => {
                if (vNumber === -2) {
                    vNumber = data.additionalInfo.verse;
                }
                versesNumber.push(data.additionalInfo.verse);
                multiVerse[data.additionalInfo.verse] = true;
            });
        }

        // if (os.device().supportsDOM) {
        //     const element = globalThis.document;
        //     const verseNumber = verse.verseNumber; // Assume this is provided

        //     // Construct the ID dynamically based on the verse number
        //     const targetElement = element.getElementById(`the-page-verse-${verseNumber}`);

        //     console.log("targetElement", targetElement, globalThis.window, `the-page-verse-${verseNumber}`);

        //     // Check if the element exists, then scroll to it
        //     if (targetElement) {
        //         targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        //     }

        //     globalThis.window.scrollTo({
        //         top: globalThis.document.documentElement.scrollHeight,
        //         behavior: 'smooth'
        //     });

        // }
        if (globalThis.ScrollToVerse) ScrollToVerse({ vNumber });

        globalThis.SetSelected && SetSelected(multiVerse);
        SetHolded(verse.verseNumber);
        break;
    }
    default: {
        return;
    }
}
globalThis.HISTORYExploreMode = initialValue;
