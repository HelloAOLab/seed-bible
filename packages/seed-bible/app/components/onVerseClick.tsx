// console.log("globalThis.CHAPTER_DATA", globalThis.CHAPTER_DATA);
if (!that.verseNumber) return;
const dataItem = {
    type: "verse",
    content: `${that.book} ${that.chapter}:${that.verseNumber}`,
    additionalInfo: {
        verse: that.verseNumber,
        chapter: that.chapter,
        book: that.book,
        data: { ...that },
        chapterData: { ...globalThis.CHAPTER_DATA }
    },
};

// console.log("ON VERSE CLICK that that", that);

const isShiftHold = globalThis?.KEY_HOLD?.['Shift'];

if (globalThis.ON_VERSE_CLICK && isShiftHold) {
    const lastBook = { ...globalThis.ON_VERSE_CLICK };
    globalThis.ADD_TO_QUEUE_ITEM = { ...lastBook };
    const currentBook = { ...that };
    const highLight = {};
    if (lastBook.book === currentBook.book && lastBook.chapter === currentBook.chapter) {
        const booksDetails = globalThis.findNameRank(lastBook.book);
        let fIndex = lastBook.verseNumber;
        let sIndex = currentBook.verseNumber;
        let i = fIndex > sIndex ? -1 : 1;
        if (fIndex === sIndex) return;
        sIndex = sIndex + i;
        do {
            const dataItemTemp = {
                type: "verse",
                content: `${currentBook.book} ${lastBook.chapter}:${fIndex}`,
                additionalInfo: {
                    bookRank: booksDetails.rank,
                    book: lastBook.book,
                    chapter: currentBook.chapter,
                    verse: fIndex,
                    data: { ...that }
                },
            }
            highLight[fIndex] = true;
            globalThis.Playlist && Playlist.tryAddDataToHistory({ dataItem: dataItemTemp });
            fIndex = fIndex + i;
        }
        while (fIndex !== sIndex);
        globalThis.HIGHLIGHT_TIMER && clearTimeout(globalThis.HIGHLIGHT_TIMER);
        SetBlinker(highLight);
        globalThis.HIGHLIGHT_TIMER = setTimeout(() => {
            SetBlinker({});
            globalThis.HIGHLIGHT_TIMER = setTimeout(() => {
                SetBlinker(highLight);
                setTimeout(() => {
                    SetBlinker({});
                }, 300)
            }, 300);
        }, 300);
    }
} else {
    globalThis.Playlist && Playlist.tryAddDataToHistory({ dataItem });
}

globalThis.ON_VERSE_CLICK = { ...that };
