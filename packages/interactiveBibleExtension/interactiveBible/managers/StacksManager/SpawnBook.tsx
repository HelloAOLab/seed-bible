/**
 * Spawns a book element into the scene based on the provided name and position. It calculates various properties like the book's scale, color, and placement based on its section, level, and other contextual data.
 * 
 * @param {Object} that - Object containing information for spawning the book.
 * @param {string} that.name - The name of the book to spawn.
 * @param {Vector3} that.spawnPosition - The optional spawn position for the book, defaults to (0,0,0).
 * 
 * @returns {Object} - The spawned book element and its associated data.
 * @property {Bot} book - The book element spawned from the object pool.
 * @property {BookData} bookData - The data associated with the spawned book.
 * 
 * @example
 * const { book, bookData } = StacksManager.SpawnBook({ name: "Genesis", spawnPosition: new Vector3(1, 1, 1) });
 */

const dimension = os.getCurrentDimension();

const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);
let {spawnPosition} = that;
const {name} = that;
let displayJarvisSpawnElementAnimation = false;
if(jarvis && !spawnPosition)
{
    spawnPosition = jarvisPosition;
    displayJarvisSpawnElementAnimation = true
}
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetBookInfoPathByName({name});
let book, bookData;
if(found)
{
    const sectionInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex];
    const amountOfChaptersInSection = GetAmountOfChaptersInSection(sectionInfo.books);
    const levels = GetSectionLevels(sectionInfo.books);
    const levelsLenght = levels.length;
    const level = levels.find((level) => {return level.some((bookInfo) => {return bookInfo.commonName == name})})
    const levelIndex = levels.indexOf(level);
    const bookInfo = sectionInfo.books.find((currentBookInfo) => {return currentBookInfo.commonName == name});
    const bookIndex = sectionInfo.books.indexOf(bookInfo);
    const bookLevelIndex = level.indexOf(bookInfo);
    bookData = await thisBot.CreateBook({
        arrangementIndex, 
        testamentIndex, 
        sectionIndex, 
        levelIndex, 
        bookIndex, 
        bookLevelIndex, 
        levelsLenght
    });
    const amountOfChaptersInLevel = level.reduce((total, bookInfo) => {return total +  bookInfo.numberOfChapters}, 0);
    const percentageOfLevelInSection = amountOfChaptersInLevel / amountOfChaptersInSection;
    const sectionAvailableSpace = (amountOfChaptersInSection * StackElementMeasurements.SectionDesiredScaleZRatio) - (StackSpacing.BetweenBooks * (levelsLenght + 1));
    const levelScaleZ = percentageOfLevelInSection * sectionAvailableSpace;
    let groupBookScaleX, groupBookScaleY;
    if(bookData.elementInfo.group)
    {
        const groupBookIndex = level.indexOf(bookInfo);
        const layout = StacksManager.GetLayoutForBooksGroup({amountOfBooks: level.length});
        const bookLayout = layout[groupBookIndex];
        ({groupBookScaleX, groupBookScaleY} = GetGroupBookData(bookLayout));
    }
    const sectionColorRGB = HexToRgb(sectionInfo.color);
    const colorRangeSize = sectionInfo.customColorRange ?? 70;
    const levelsColorRange = {
        min: [Math.max(sectionColorRGB[0] - colorRangeSize, 0), Math.max(sectionColorRGB[1] - colorRangeSize, 0), Math.max(sectionColorRGB[2] - colorRangeSize, 0)],
        max: [Math.min(sectionColorRGB[0] + colorRangeSize, 255), Math.min(sectionColorRGB[1] + colorRangeSize, 255), Math.min(sectionColorRGB[2] + colorRangeSize, 255)]
    }
    const deltaRed = Math.floor((levelsColorRange.max[0] - levelsColorRange.min[0]) / levelsLenght);
    const deltaGreen = Math.floor((levelsColorRange.max[1] - levelsColorRange.min[1]) / levelsLenght);
    const deltaBlue = Math.floor((levelsColorRange.max[2] - levelsColorRange.min[2]) / levelsLenght);
    const levelsColors = levels.map((level, i) => {
        const levelColorRGB = [levelsColorRange.min[0] + (deltaRed * i), levelsColorRange.min[1] + (deltaGreen * i), levelsColorRange.min[2] + (deltaBlue * i)];
        return RgbToHex(levelColorRGB);
    })
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementStart({
        scales: new Vector3(
            groupBookScaleX ?? StackElementMeasurements.BookScales.x,
            groupBookScaleY ?? StackElementMeasurements.BookScales.y,
            levelScaleZ
        )
    })
    book = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Book});
    const bookMod = {
        [dimension]                  : true,
        [dimension + "X"]            : spawnPosition.x,
        [dimension + "Y"]            : spawnPosition.y,
        [dimension + "Z"]            : spawnPosition.z,
        typeOfElement                : BibleElementType.Book,
        bookIndex                    : bookData.creationInfo.levelIndex,
        isBibleElement               : true,
        bookName                     : bookData.elementInfo.commonName,
        sectionName                  : bookData.elementInfo.name,
        sectionIndex                 : bookData.creationInfo.sectionIndex,
        label                        : bookData.elementInfo.commonName,
        labelColor                   : bookData.creationInfo.levelIndex < Math.floor(bookData.creationInfo.levelsLenght/2) ? "#FFFFFF" : "#000000",
        labelOpacity                 : 0,
        formOpacity                  : 1,
        numberOfChapters             : bookData.elementInfo.numberOfChapters,
        explodedViewPosition         : bookData.elementInfo.explodedViewPosition,
        explodedViewCustomScale      : bookData.elementInfo.explodedViewCustomScale ?? null,
        isGroupBook                  : bookData.elementInfo.group ? true : null,
        groupId                      : bookData.elementInfo.group ?? null,
        groupBookIndex               : bookData.elementInfo.group ? bookData.creationInfo.bookLevelIndex : null,
        draggable                    : thisBot.masks.areBibleElementsDraggable,
        desiredPositionZ             : spawnPosition.z,
        scaleX                       : groupBookScaleX ?? StackElementMeasurements.BookScales.x,
        scaleY                       : groupBookScaleY ?? StackElementMeasurements.BookScales.y,
        scaleZ                       : levelScaleZ,
        initialScaleX                : groupBookScaleX ?? StackElementMeasurements.BookScales.x,
        initialScaleY                : groupBookScaleY ?? StackElementMeasurements.BookScales.y,
        initialScaleZ                : levelScaleZ,
        hoveredScaleX                : (groupBookScaleX ?? StackElementMeasurements.BookScales.x) + StackElementMeasurements.AditionalBookScaleOnHover,
        hoveredScaleY                : (groupBookScaleY ?? StackElementMeasurements.BookScales.y) + StackElementMeasurements.AditionalBookScaleOnHover,
        desiredScaleZ                : levelScaleZ,
        color                        : bookData.elementInfo.customColor ?? levelsColors[levelIndex],
        strokeColor                  : "clear",
        orginalColor                 : levelsColors[levelIndex],
        initialColor                 : levelsColors[levelIndex],
        labelTextColor               : levelsColors[Math.round(levelsColors.length * 0.4) - 1],
        // layoutBookDirectionNormalized: bookData.elementInfo.group ? new Vector3(groupBookLayoutPositionX, groupBookLayoutPositionY, 0).normalize() : null,
        bookInfo                     : bookData.elementInfo,
        singleBooksScales            : StackElementMeasurements.BookScales,
        toErase                      : true,
    };
    book.OnSpawned({mod: bookMod});
    bookData.element = book;
    bookData.isActive = true;
    setTagMask(book, 'highlightable', true);
    setTagMask(book, "pointable", true);
    setTagMask(book, 'isOnTheGround', true);
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementEnd({scales: new Vector3(
        groupBookScaleX ?? StackElementMeasurements.BookScales.x,
        groupBookScaleY ?? StackElementMeasurements.BookScales.y,
        levelScaleZ
    )})
}

return {book, bookData};