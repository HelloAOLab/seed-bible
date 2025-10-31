/**
    * Generates and retrieves chunks of verses from the chapter.
    * @returns {Array} chunks - Array of verse chunks with initial and final verse numbers.
    * @example
    * const verseChunks = chapter.GetChunksOfVerses();
*/

const {mapChapterData} = that;
const chunks = [];
const versesPerChunk = 12;
let chunksCount = Math.floor(mapChapterData.elementInfo.amountOfVerses / versesPerChunk);
let remainingVerses = mapChapterData.elementInfo.amountOfVerses;
let currentVerseNumber = 1;
if((mapChapterData.elementInfo.amountOfVerses - (versesPerChunk * chunksCount)) > 0) chunksCount++
for(let i = 0; i < chunksCount; i++)
{
    const chunk = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.ChunkOfVerses});
    const amountOfVerses = Math.min(remainingVerses, versesPerChunk);
    setTagMask(chunk, 'initialVerseNumber', currentVerseNumber);
    setTagMask(chunk, 'finalVerseNumber', currentVerseNumber + amountOfVerses - 1);
    setTagMask(chunk, 'mapChapterDataId', mapChapterData.id);
    setTagMask(chunk, "chapterOrigin", "map");
    const label = chunk.masks.initialVerseNumber !== chunk.masks.finalVerseNumber ? `${chunk.masks.initialVerseNumber} - ${chunk.masks.finalVerseNumber}` : `${chunk.masks.initialVerseNumber}`
    setTagMask(chunk, 'chunkPath', `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber} ${label}`);
    setTagMask(chunk, 'arrangementIndex', thisBot.tags.arrangementIndex);
    setTagMask(chunk, 'parentBookName', thisBot.tags.parentBookName)
    setTagMask(chunk, 'chapterNumber', thisBot.tags.chapterNumber)
    setTagMask(chunk, 'label', label)
    if(InstanceManager.masks.isInHistoryMode) setTagMask(chunk, "color", GetHistoryColor({element: chunk}))
    else
    {
        const currentHighlightInfo = mapChapterData.GetHighlightInfoByKey(chunk.masks.chunkPath)
        if(currentHighlightInfo) setTagMask(chunk, "color", currentHighlightInfo.color)
    }
    currentVerseNumber += amountOfVerses;
    remainingVerses -= amountOfVerses;
    chunks.push(chunk);
}
return chunks;