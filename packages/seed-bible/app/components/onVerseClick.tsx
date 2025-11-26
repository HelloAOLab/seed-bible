// console.log("globalThis.CHAPTER_DATA", globalThis.CHAPTER_DATA);

if (!that.verseNumber) return;

const isShiftHold = globalThis?.KEY_HOLD?.['shift'];

if(globalThis.IsEditingAnnotation) {
    ShowNotification({
        message: `You are editing an annotation. Please save it first.`,
        severity: "error",
    });
    return;
}

if (!isShiftHold) {
    globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID = createUUID && createUUID();
}

const dataItem = {
    type: "verse",
    content: `${that.book} ${that.chapter}:${that.verseNumber}`,
    additionalInfo: {
        verse: that.verseNumber,
        chapter: that.chapter,
        book: that.book,
        data: { ...that },
        chapterData: { ...globalThis.CHAPTER_DATA },
        groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID
    },
};

// console.log("ON VERSE CLICK that that", that);


if (globalThis.ON_VERSE_CLICK && isShiftHold) {
    const lastBook = { ...globalThis.ON_VERSE_CLICK };
    globalThis.ADD_TO_QUEUE_ITEM = { ...lastBook };
    const currentBook = { ...that };
    const highLight = {};
    if (lastBook.book === currentBook.book && lastBook.chapter === currentBook.chapter) {
        const verses = [];
        const booksDetails = globalThis.findNameRank(lastBook.book);
        let fIndex = lastBook.verseNumber;
        let sIndex = currentBook.verseNumber;
        const i = fIndex > sIndex ? -1 : 1;
        if (fIndex === sIndex) return;
        sIndex = sIndex + i;
        do {
            highLight[fIndex] = true;
            verses.push(fIndex);
            fIndex = fIndex + i;
        }
        while (fIndex !== sIndex);
        const dataItemTemp = {
            type: "verse-grouped",
            content: `${currentBook.book} ${lastBook.chapter}:${verses[0]}-${verses[verses.length - 1]}`,
            additionalInfo: {
                bookRank: booksDetails.rank,
                book: lastBook.book,
                chapter: currentBook.chapter,
                verse: verses,
                data: { ...that, verse: verses, },
                chapterData: { ...globalThis.CHAPTER_DATA },
                groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
            },
        }

        globalThis.Playlist && Playlist.tryAddDataToHistory({ dataItem: dataItemTemp, combineLast: verses.length > 1 && !globalThis.isLastItemCombine });

        globalThis.isLastItemCombine = verses.length > 1;

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
    globalThis.isLastItemCombine = false;
    globalThis.Playlist && Playlist.tryAddDataToHistory({ dataItem });
}

globalThis.ON_VERSE_CLICK = { ...that };
