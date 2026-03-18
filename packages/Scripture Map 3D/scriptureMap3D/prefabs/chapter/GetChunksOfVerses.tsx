import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

/**
 * Generates and retrieves chunks of verses from the chapter.
 * @returns {Array} chunks - Array of verse chunks with initial and final verse numbers.
 * @example
 * const verseChunks = chapter.GetChunksOfVerses();
 */

const { chapterData } = that;
const chunks = [];
const versesPerChunk = 12;
let chunksCount = Math.floor(
  chapterData.pieceInfo.amountOfVerses / versesPerChunk
);
let remainingVerses = chapterData.pieceInfo.amountOfVerses;
let currentVerseNumber = 1;
if (chapterData.pieceInfo.amountOfVerses - versesPerChunk * chunksCount > 0)
  chunksCount++;
for (let i = 0; i < chunksCount; i++) {
  const chunk = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.LayoutChunkOfVerses,
  });
  const amountOfVerses = Math.min(remainingVerses, versesPerChunk);
  setTagMask(chunk, "initialVerseNumber", currentVerseNumber);
  setTagMask(
    chunk,
    "finalVerseNumber",
    currentVerseNumber + amountOfVerses - 1
  );
  setTagMask(chunk, "chapterDataId", chapterData.id);
  setTagMask(chunk, "chapterOrigin", "map");
  const label =
    chunk.masks.initialVerseNumber !== chunk.masks.finalVerseNumber
      ? `${chunk.masks.initialVerseNumber} - ${chunk.masks.finalVerseNumber}`
      : `${chunk.masks.initialVerseNumber}`;
  setTagMask(
    chunk,
    "chunkPath",
    `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber} ${label}`
  );
  setTagMask(chunk, "arrangementIndex", thisBot.tags.arrangementIndex);
  setTagMask(chunk, "parentBookName", thisBot.tags.parentBookName);
  setTagMask(chunk, "chapterNumber", thisBot.tags.chapterNumber);
  setTagMask(chunk, "label", label);
  if (BibleVizUtils.Data.masks.isInHistoryMode)
    setTagMask(
      chunk,
      "color",
      BibleVizUtils.Functions.GetHistoryColor({ piece: chunk })
    );
  else {
    const currentHighlightInfo = chapterData.getHighlightInfoByKey(
      chunk.masks.chunkPath
    );
    if (currentHighlightInfo)
      setTagMask(chunk, "color", currentHighlightInfo.color);
  }
  currentVerseNumber += amountOfVerses;
  remainingVerses -= amountOfVerses;
  chunks.push(chunk);
}
return chunks;
