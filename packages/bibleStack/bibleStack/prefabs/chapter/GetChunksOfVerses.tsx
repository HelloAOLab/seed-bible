/** 
    * Generates and retrieves chunks of verses from the chapter.
    * @returns {Array} chunks - Array of verse chunks with initial and final verse numbers.
    * @example
    * const verseChunks = chapter.GetChunksOfVerses();
*/

const chapterData = StacksManager.GetBibleElementData({element: thisBot});
const chunks = [];
const versesPerChunk = 12;
let chunksCount = Math.floor(chapterData.elementInfo.amountOfVerses / versesPerChunk);
let remainingVerses = chapterData.elementInfo.amountOfVerses;
let currentVerseNumber = 1;
if((chapterData.elementInfo.amountOfVerses - (versesPerChunk * chunksCount)) > 0) chunksCount++
for(let i = 0; i < chunksCount; i++)
{
    const chunk = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.StackChunkOfVerses});
    const amountOfVerses = Math.min(remainingVerses, versesPerChunk);
    setTagMask(chunk, 'initialVerseNumber', currentVerseNumber);
    setTagMask(chunk, 'finalVerseNumber', currentVerseNumber + amountOfVerses - 1);
    setTagMask(chunk, 'chapterDataId', chapterData.id);
    setTagMask(chunk, "chapterOrigin", "stack");
    const label = chunk.masks.initialVerseNumber !== chunk.masks.finalVerseNumber ? `${chunk.masks.initialVerseNumber} - ${chunk.masks.finalVerseNumber}` : `${chunk.masks.initialVerseNumber}`
    setTagMask(chunk, 'chunkPath', `${chapterData.element.tags.parentBookName} ${chapterData.element.tags.chapterNumber} ${label}`);
    setTagMask(chunk, 'arrangementIndex', chapterData.element.tags.arrangementIndex);
    setTagMask(chunk, 'parentBookName', chapterData.element.tags.parentBookName)
    setTagMask(chunk, 'chapterNumber', chapterData.element.tags.chapterNumber)
    setTagMask(chunk, 'label', label)
    if(InstanceManager.masks.isInHistoryMode) setTagMask(chunk, "color", GetHistoryColor({element: chunk}))
    else
    {
        const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == chunk.masks.chunkPath})
        if(chunkHighlightInfo) setTagMask(chunk, "color", chunkHighlightInfo.color)
    }
    currentVerseNumber += amountOfVerses;
    remainingVerses -= amountOfVerses;
    chunks.push(chunk);
}
return chunks;