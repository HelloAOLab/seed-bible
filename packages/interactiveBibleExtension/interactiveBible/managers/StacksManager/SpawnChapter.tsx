/**
 * Spawns a chapter from a specified book and initializes its properties. If the chapter is valid, it will be selected after spawning.
 * 
 * @param {Object} that - Object containing the chapter and book information.
 * @param {string} that.bookName - The name of the book from which the chapter will be spawned.
 * @param {number} that.chapterNumber - The number of the chapter to spawn.
 * @param {Vector3} that.spawnPosition - Is optional and is the position where the chapter will be spawned, defaults to Vector3(0,0,0).
 * 
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the chapter is successfully spawned and selected, `false` otherwise.
 * 
 * @example
 * const chapterSpawned = await StacksManager.SpawnChapter({
 *   bookName: "Genesis",
 *   chapterNumber: 5,
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

if(thisBot.masks.isBibleAnimating) return;
setTagMask(thisBot, 'isBibleAnimating', true);

const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);
let {spawnPosition} = that;
const {bookName, chapterNumber} = that;
let displayJarvisSpawnElementAnimation = false;
if(jarvis && !spawnPosition)
{
    spawnPosition = jarvisPosition;
    displayJarvisSpawnElementAnimation = true
}
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetBookInfoPathByName({name: bookName});
let chapterSpawned = false;
// let book;
if(found)
{
    const {chaptersInfo} = StacksManager.tags.booksStaticInfo[bookInfo.commonName];
    const bookInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.find((currentBookInfo) => {return currentBookInfo.commonName == bookName});
    const chaptersLength = chaptersInfo.length
    const chapterIndex = chapterNumber - 1;
    if(chapterIndex >= 0 && chapterIndex < chaptersLength)
    {
        const chapterInfo = chaptersInfo[chapterIndex];
        const chapterData = await thisBot.CreateChapter({chapterInfo})
        const chapter = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Chapter});
        const chapterDeltaDepth = (StackElementMeasurements.BookScales.y - (chapter.tags.gapY*2) - StackElementMeasurements.MinChapterBackDepth) * (chapterInfo.amountOfVerses / thisBot.GetBiggerChapter());
        if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementStart({scales: new Vector3(
            StackElementMeasurements.ChapterWidth,
            StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            StackElementMeasurements.ChapterHeight
        )})
        const chapterMod = {
            [dimension]: true,
            [dimension + "X"]: spawnPosition.x,
            [dimension + "Y"]: spawnPosition.y,
            [dimension + "Z"]: spawnPosition.z,
            creator: null,
            index: chapterIndex,
            chapterNumber,
            chapterWidth: StackElementMeasurements.ChapterWidth,
            chapterHeight: StackElementMeasurements.ChapterHeight,
            parentBookName: bookName,
            arrangementIndex,
            scaleX: StackElementMeasurements.ChapterWidth,
            scaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            scaleZ: StackElementMeasurements.ChapterHeight,
            initialScaleX: StackElementMeasurements.ChapterWidth,
            initialScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            initialScaleZ: StackElementMeasurements.ChapterHeight,
            initialScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            selectedScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth + StackElementMeasurements.ChapterFrontSelectedDepth,
            label: chapterNumber + (bookInfo.startingIndex ?? 0),
            toErase: true
        }
        chapter.OnSpawned({mod: chapterMod});
        chapterData.element = chapter;
        chapterData.isActive = true;
        setTagMask(chapter, "isOnTheGround", true);
        if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementEnd({scales: new Vector3(
            StackElementMeasurements.ChapterWidth,
            StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
            StackElementMeasurements.ChapterHeight
        )})
        await chapter.Select();
        chapterSpawned = true
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);

return chapterSpawned