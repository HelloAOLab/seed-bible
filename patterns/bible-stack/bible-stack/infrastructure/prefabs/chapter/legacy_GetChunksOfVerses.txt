import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

/**
 * Generates and retrieves chunks of verses from the chapter.
 * @returns {Array} chunks - Array of verse chunks with initial and final verse numbers.
 * @example
 * const verseChunks = chapter.GetChunksOfVerses();
 */

import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

const chapterData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("GetChunksOfVerses: chapterData not found.");
}

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
    tag: ObjectPoolTags.VersesBundle,
  });
  const amountOfVerses = Math.min(remainingVerses, versesPerChunk);
  setTagMask(chunk, "initialVerseNumber", currentVerseNumber);
  setTagMask(
    chunk,
    "finalVerseNumber",
    currentVerseNumber + amountOfVerses - 1
  );
  setTagMask(chunk, "chapterDataId", chapterData.id);
  setTagMask(chunk, "chapterOrigin", "stack");
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
    const chunkHighlightInfo = chapterData.HighlightsInfo.find(
      (currHighlightInfo) => {
        return currHighlightInfo.key == chunk.masks.chunkPath;
      }
    );
    if (chunkHighlightInfo)
      setTagMask(chunk, "color", chunkHighlightInfo.color);
  }
  currentVerseNumber += amountOfVerses;
  remainingVerses -= amountOfVerses;
  chunks.push(chunk);
}
return chunks;
