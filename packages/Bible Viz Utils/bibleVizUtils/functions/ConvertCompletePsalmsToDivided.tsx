const {chapter} = that;

const dividedPaslmsInfo = [
    ["1 Psalms", BibleVizUtils.Data.tags.booksStaticInfo["1 Psalms"]],
    ["2 Psalms", BibleVizUtils.Data.tags.booksStaticInfo["2 Psalms"]],
    ["3 Psalms", BibleVizUtils.Data.tags.booksStaticInfo["3 Psalms"]],
    ["4 Psalms", BibleVizUtils.Data.tags.booksStaticInfo["4 Psalms"]],
    ["5 Psalms", BibleVizUtils.Data.tags.booksStaticInfo["5 Psalms"]],
]

const psalmInfo = dividedPaslmsInfo.find(([, info]) => {
    return (info.startingIndex + 1) <= chapter &&  chapter <= (info.startingIndex + info.numberOfChapters)
})

if(psalmInfo)
{
    return {book: psalmInfo[0], chapter: chapter - psalmInfo[1].startingIndex}
}