// type
// content

const dataArray = that;

if (!dataArray?.length) return [];

const convertedData = [];

let lastItem = undefined;
let lastGroup = [];

const checkAndAddData = (data = undefined) => {
    if (lastGroup.length > 0) {
        const isVerseGroup = lastGroup[0].type === "verse";
        let itemType =
            lastGroup[0].type === "verse" ? "verse-range" : "chapter-range";
        lastGroup.push(lastItem);

        let bookName = isVerseGroup ? lastItem.additionalInfo.book : lastItem.additionalInfo.bookName;

        if (bookName?.startsWith("Psalm")) {
            bookName = getPsalmsBookName(lastItem.additionalInfo.chapter);
        }

        let chapterRange = ` ${lastGroup[0].additionalInfo.chapter} - ${lastItem.additionalInfo.chapter}`;

        if (lastItem.additionalInfo.chapters === lastGroup.length && !lastItem?.content.toLocaleLowerCase().includes("psalms")) {
            itemType = "book-range";
            chapterRange = "";
        }

        convertedData.push({
            type: itemType,
            content: isVerseGroup
                ? `${bookName} ${lastItem.additionalInfo.chapter}:${lastGroup[0].additionalInfo.verse}-${lastItem.additionalInfo.verse}`
                : `${bookName}${chapterRange}`,
            additionalInfo: [...lastGroup],
            id: `${pseudoIndentifier}${lastGroup[0].id}`,
        });
        lastGroup = [];
    } else {
        convertedData.push(lastItem);
    }
    lastItem = data;
};

dataArray.forEach((data, index) => {
    if (data) {

        const dataCopy = { ...data, originalIndex: index };
        if (lastItem && lastItem.type !== dataCopy.type) {
            checkAndAddData(dataCopy);
            return;
        }

        if (lastItem) {
            switch (dataCopy.type) {
                case "verse":
                    const verseNumberCurr = dataCopy.additionalInfo.verse;
                    const verseNumberOld = lastItem.additionalInfo.verse;

                    const chapterCurr = dataCopy.additionalInfo.chapter;
                    const chapterOld = lastItem.additionalInfo.chapter;

                    if (
                        verseNumberCurr - verseNumberOld === 1 &&
                        chapterCurr === chapterOld
                    ) {
                        lastGroup.push(lastItem);
                        lastItem = dataCopy;
                    } else {
                        checkAndAddData(dataCopy);
                    }

                    break;
                case "chapter":
                    const chapterNumberCurr = dataCopy.additionalInfo.chapter;
                    const chapterNumberOld = lastItem.additionalInfo.chapter;

                    const bookNameCurr = dataCopy.additionalInfo.bookName;
                    const bookNameOld = lastItem.additionalInfo.bookName;

                    if (
                        chapterNumberCurr - chapterNumberOld === 1 &&
                        bookNameOld === bookNameCurr
                    ) {
                        lastGroup.push(lastItem);
                    } else {
                        checkAndAddData(dataCopy);
                    }
                    lastItem = dataCopy;
                    break;
                default:
                    convertedData.push(lastItem);
                    lastItem = dataCopy;
                    break;
            }
        } else {
            lastItem = dataCopy;

        }
    }

});
checkAndAddData();
return convertedData;
