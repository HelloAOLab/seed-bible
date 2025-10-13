/**
    * Selects the chunk of verses, animating their appearance and positioning the verses in the defined layout.
    * @example
    * chunkOfVerses.Select();
*/

setTagMask(thisBot, 'isSelected', true);
const dimension = os.getCurrentDimension();
const amountOfVerses = thisBot.masks.finalVerseNumber - thisBot.masks.initialVerseNumber + 1;
let verses = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutVerse, amount: amountOfVerses});
verses = Array.isArray(verses) ? verses : [verses];
const maxHorizontalAmountOfVersesPerChunk = 6;
const maxVerticalAmountOfVersesPerChunk = 2;
const gapBetweenVerses = 0.05;
const fixedVerseScales = new Vector3(
    (thisBot.tags.scaleX/maxHorizontalAmountOfVersesPerChunk) - gapBetweenVerses,
    (thisBot.tags.scaleY/maxVerticalAmountOfVersesPerChunk) - gapBetweenVerses,
    thisBot.tags.desiredScaleZ - gapBetweenVerses
);
const chunkPosition = getBotPosition(thisBot, dimension);
const chunkScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const duration = 0.3;
const firstSequenceEasing = {type: 'sinusoidal', mode: 'out'};
const secondSequenceEasing = {type: 'cubic', mode: 'out'};
let column = 0;
let row = 0;
let currentChapterNumber = thisBot.masks.initialVerseNumber;
thisBot.vars.verses = verses;
verses.forEach((verse) => {
    const positionX = chunkPosition.x - (chunkScales.x/2) + (fixedVerseScales.x/2) + (gapBetweenVerses/2) + (column * (fixedVerseScales.x + gapBetweenVerses));
    const positionY = chunkPosition.y + (chunkScales.y/2) - (fixedVerseScales.y/2) - (gapBetweenVerses/2) - (row * (fixedVerseScales.y + gapBetweenVerses));
    const positionZ = chunkPosition.z;

    setTagMask(verse, dimension, true);
    setTagMask(verse, dimension + "X", positionX);
    setTagMask(verse, dimension + "Y", positionY);
    setTagMask(verse, dimension + "Z", positionZ);
    setTagMask(verse, 'scaleX', fixedVerseScales.x);
    setTagMask(verse, 'scaleY', fixedVerseScales.y);
    setTagMask(verse, 'scaleZ', fixedVerseScales.z);
    setTagMask(verse, 'label', currentChapterNumber);
    setTagMask(verse, "chapterDataId", thisBot.masks.chapterDataId);
    setTagMask(verse, 'chapterDataId', thisBot.masks.chapterDataId);
    setTagMask(verse, "chapterOrigin", thisBot.masks.chapterOrigin);
    setTagMask(verse, 'versePath', `${thisBot.masks.parentBookName} ${thisBot.masks.chapterNumber} ${currentChapterNumber}`);
    setTagMask(verse, 'parentChunkPath', thisBot.masks.chunkPath);
    setTagMask(verse, 'arrangementIndex', thisBot.masks.arrangementIndex);
    setTagMask(verse, 'bookName', thisBot.masks.parentBookName);
    setTagMask(verse, 'chapterNumber', thisBot.masks.chapterNumber);
    if(BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(verse, "color", BibleVizUtils.Functions.GetHistoryColor({piece: verse})) 
    else
    {
        const chapterData = thisBot.masks.chapterDataId ? BibleStackManager.GetChapterDataById({id: thisBot.masks.chapterDataId}) :
            ScriptureMap3DManager.GetChapterDataById({id: thisBot.masks.chapterDataId});
        const currentHighlightInfo = chapterData.GetHighlightInfoByKey(verse.masks.versePath)
        if(currentHighlightInfo) setTagMask(verse, "color", currentHighlightInfo.color)
    }
    currentChapterNumber++
    column++;
    if(column >= maxHorizontalAmountOfVersesPerChunk)
    {
        column = 0;
        row++;
    }
})
await animateTag(thisBot, {
    fromValue: {
        scaleZ: chunkScales.z,
        labelOpacity: (thisBot.masks.labelOpacity ?? thisBot.tags.labelOpacity)
    },
    toValue: {
        scaleZ: 0,
        labelOpacity: 0
    },
    duration: duration/2,
    easing: firstSequenceEasing
}).then(() => {
    return animateTag(thisBot, {
        fromValue: {
            scaleX: chunkScales.x,
            scaleY: chunkScales.y,
        },
        toValue: {
            scaleX: 0,
            scaleY: 0,
        },
        duration: duration/2,
        easing: secondSequenceEasing
    })
})
setTagMask(thisBot, dimension, false);
return true;