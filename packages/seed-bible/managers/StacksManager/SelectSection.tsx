/**
    * Handles a section selection. It modify the data of the selected section on the bibleStructure,
    * then divides it into books and resposition the rest of the elements if needed
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.section - The section to divide intobooks
    * @example
    * thisBot.SelectSection({section});
*/

import {AnimateTagObject} from "managers.InstanceManager.AnimateTagObject"

const {section, speedMultiplier = 1, isInstantaneous = false} = that;
const sectionData = thisBot.GetBibleElementData({element: section});
const {bibleData, testamentData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});
const dimension = os.getCurrentDimension();
const easeInOutSine = {type: "sinusoidal", mode: "inout"};
let sectionPosition;
const currentColorRGB = HexToRgb(sectionData.highlightColor ?? sectionData.element.tags.orginalColor);
const colorRangeSize = sectionData.elementInfo.customColorRange ?? 70;
const levelsColorRange = {
    min: [Math.max(currentColorRGB[0] - colorRangeSize, 0), Math.max(currentColorRGB[1] - colorRangeSize, 0), Math.max(currentColorRGB[2] - colorRangeSize, 0)],
    max: [Math.min(currentColorRGB[0] + colorRangeSize, 255), Math.min(currentColorRGB[1] + colorRangeSize, 255), Math.min(currentColorRGB[2] + colorRangeSize, 255)]
}
let sectionAvailableSpace = sectionData.element.tags.desiredScaleZ - (StackSpacing.BetweenBooks * (sectionData.childrenData.length + 1));
let firstSequenceAnimationsObjects = [];
let secondSequenceAnimationsObjects = [];
let thirdSequenceAnimations = [];
const firstSequenceAnimationDuration =  isInstantaneous ? 0 : (0.4/speedMultiplier);
const secondSequenceAnimationDuration =  isInstantaneous ? 0 : (0.4/speedMultiplier);
let levelsColors = [];
const deltaRed = Math.floor((levelsColorRange.max[0] - levelsColorRange.min[0]) / sectionData.childrenData.length);
const deltaGreen = Math.floor((levelsColorRange.max[1] - levelsColorRange.min[1]) / sectionData.childrenData.length);
const deltaBlue = Math.floor((levelsColorRange.max[2] - levelsColorRange.min[2]) / sectionData.childrenData.length);
const timeBetweenBookAnimation =  isInstantaneous ? 0 : (50/speedMultiplier);
let bookDesiredPositionZOnRegularView;
let bookDesiredPositionZ;
let bookInitialPositionZ;
const bookScalesOnMod = {x: 0.1, y: 0.1, z: 0.1}
let bibleElements;
let fixedBooksData;
let elementsAboveSection = GetElementsAboveSection();
const previousExplodedViewSectionData = (bibleData || testamentData) ? thisBot.GetPreviousExplodedViewSectionData({bibleData, testamentData}) : null;
const collisionType = bibleData?.bibleType === BibleType.PlatformerGame ? CollisionType.Collision : null;
InstanceManager.TryHideUsersNotificationOnElement({element: section})
setTagMask(thisBot, "isBibleAnimating", true);
if(thisBot.vars.highlightedElements.length > 0)
{
    const elementsToUnhighlight = (bibleData || testamentData) ? thisBot.vars.highlightedElements.map((element) => {return thisBot.GetBibleElementData({element})})
        .filter((elementData) => {
            return  !elementData.element.masks.isOnTheGround    && 
                    !elementData.element.masks.isUnhighlighting &&
                    ((bibleData && elementData.parentDataIds.bibleId && elementData.parentDataIds.bibleId === bibleData.id) ||
                    (elementData.parentDataIds.testamentId && elementData.parentDataIds.testamentId === testamentData.id))
        })
        .map((elementData) => {return elementData.element}) : [section]
    if(elementsToUnhighlight.length > 0)
    {
        await Promise.all(elementsToUnhighlight.map((element) => {
            return thisBot.TryUnhighlightElement({isInstantaneous, element, tryUpdateUsersNotification: (element.id == section.id ? false : true), requestSource: StackElementInteractionType.Transition});
        }));
        thisBot.vars.highlightedElements = SubtractArrays(thisBot.vars.highlightedElements, elementsToUnhighlight)
    }
}

if(previousExplodedViewSectionData && (!bibleData || bibleData.currentStackVizState === BibleVisualizationState.Regular))
{
    previousExplodedViewSectionData.isInExplodedView = false;
    const updateStacksTime = await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
}
sectionPosition = getBotPosition(sectionData.element, dimension);
sectionData.isSplitIntoBooks = true;
sectionData.isInExplodedView = true;
thisBot.vars.lastInteractedSectionData = sectionData;
sectionData.childrenData
    .flat()
    .forEach((bookData) => {
        bookData.isInsideBible = sectionData.isInsideBible;
        bookData.isInsideTestament = sectionData.isInsideTestament;
        bookData.isInsideSection = true;
    }
)
shout("OnBibleElementSelected", {element: section});

if(bibleData || testamentData)
{
    const sectionShadows = (bibleData || testamentData) ? thisBot.vars.sectionsData.filter((currentSectionData) => {
        return (bibleData ? (currentSectionData.parentDataIds.bibleId === bibleData.id) : (currentSectionData.parentDataIds.testamentId === testamentData.id)) && 
            currentSectionData.shadow &&
            currentSectionData.shadow.tags.isInUse &&
            currentSectionData.shadow.tags[dimension + 'Z'] > sectionPosition.z
        }
    ).map((currentSectionData) => {return currentSectionData.shadow}) : [];
    elementsAboveSection = elementsAboveSection.concat(sectionShadows);
    if(bibleData)
    {
        const crossLines = [bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine];
        const crossLinesPosition = getBotPosition(crossLines[0], dimension);
        elementsAboveSection = elementsAboveSection.concat([bibleData.staticBibleElements.upperCover], crossLinesPosition.z > sectionPosition.z ? crossLines : [])
    }
}

firstSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.element,
        tag: dimension + "RotationZ",
        options: {
            toValue: -0.05235988,
            duration: (firstSequenceAnimationDuration / 4),
            easing: {type: "sinusoidal", mode: "in"}
        },
        then: new AnimateTagObject({
            bot: sectionData.element,
            tag: dimension + "RotationZ",
            options: {
                toValue: 0.1308997,
                duration: (firstSequenceAnimationDuration / 4),
                easing: {type: "sinusoidal", mode: "out"}
            },
            then: new AnimateTagObject({
                bot: sectionData.element,
                tag: dimension + "RotationZ",
                options: {
                    toValue: -0.05235988,
                    duration: (firstSequenceAnimationDuration / 4),
                    easing: {type: "sinusoidal", mode: "out"}
                },
                then: new AnimateTagObject({
                    bot: sectionData.element,
                    tag: dimension + "RotationZ",
                    options: {
                        toValue: 0,
                        duration: (firstSequenceAnimationDuration / 4),
                        easing: {type: "sinusoidal", mode: "out"}
                    }
                })
            })
        })
    })
)

if(sectionData.isInExplodedView)
{
    const deltaScaleZ = sectionData.element.tags.desiredExplodedViewScaleZ - sectionData.element.tags.desiredScaleZ;        
    const sectionNewPositionZ = sectionPosition.z + (sectionData.element.masks.isOnTheGround ? 0 : StackSpacing.ExplodedViewSectionPadding);
    let elementCurrentPosition, elementNewPositionZ;
    setTag(sectionData.element, "desiredPositionZ", sectionNewPositionZ)
    firstSequenceAnimationsObjects.push(
        new AnimateTagObject({
            bot: sectionData.element,
            tag: dimension + "Z",
            options: {
                toValue: sectionNewPositionZ,
                duration: firstSequenceAnimationDuration,
                easing: easeInOutSine

            }
        })
    )
    elementsAboveSection.forEach((element) => {
        elementCurrentPosition = getBotPosition(element, dimension);
        elementNewPositionZ = elementCurrentPosition.z + deltaScaleZ + (StackSpacing.ExplodedViewSectionPadding*2);
        if(element.tags.isBibleElement) setTag(element, "desiredPositionZ", elementNewPositionZ);
        firstSequenceAnimationsObjects.push(
            new AnimateTagObject({
                bot: element,
                tag: dimension + "Z",
                options: {
                    toValue: elementNewPositionZ,
                    duration: firstSequenceAnimationDuration,
                    easing: easeInOutSine
                }
            })
        )
    })
}
else
{
    bookDesiredPositionZOnRegularView = sectionData.element.tags.desiredPositionZ + StackSpacing.BetweenBooks;
}

firstSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.element,
        tag: "scaleZ",
        options: {
            toValue: sectionData.element.tags.desiredExplodedViewScaleZ,
            duration: firstSequenceAnimationDuration,
            easing: easeInOutSine
        }
    })
)
secondSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.element,
        tag: "formOpacity",
        options: {
            toValue: 0,
            duration: secondSequenceAnimationDuration,
            easing: {type: "sinusoidal", mode: "out"}
        }
    })
)

try
{
    if(isInstantaneous) firstSequenceAnimationsObjects.forEach((setTagObject) => {GetSetTagFromObject(setTagObject)})
    else await Promise.allSettled(firstSequenceAnimationsObjects.map((animateTagObject) => {return GetAnimateTagFromObject(animateTagObject)}))
    
    if(isInstantaneous) secondSequenceAnimationsObjects.forEach((setTagObject) => {GetSetTagFromObject(setTagObject)})
    else await Promise.all(secondSequenceAnimationsObjects.map((animateTagObject) => {return GetAnimateTagFromObject(animateTagObject)}))
    
    setTagMask(section, 'color', 'clear');
    setTagMask(section, 'pointable', false);
}
catch(error){console.error(error)}

for(let i = 0; i < sectionData.childrenData.length; i++)
{
    const levelColorRGB = [levelsColorRange.min[0] + (deltaRed * i), levelsColorRange.min[1] + (deltaGreen * i), levelsColorRange.min[2] + (deltaBlue * i)];
    const levelColorHex = RgbToHex(levelColorRGB);
    levelsColors.push(levelColorHex);
}
for(let bookDataArr of sectionData.childrenData)
{
    const bookDataIndex = sectionData.childrenData.indexOf(bookDataArr);
    let percentageOfLevelInSection;
    let levelScaleZ;
    const amountOfChaptersInLevel = bookDataArr.reduce((total, bookData) => {
        const {numberOfChapters} = StacksManager.tags.booksStaticInfo[bookData.elementInfo.commonName]; 
        return total + numberOfChapters
    }, 0);
    const layout = StacksManager.GetLayoutForBooksGroup({amountOfBooks: bookDataArr.length});
    for(let bookData of bookDataArr)
    {
        const {numberOfChapters} = StacksManager.tags.booksStaticInfo[bookData.elementInfo.commonName];
        let groupBookScaleX, groupBookScaleY, groupBookPositionX, groupBookPositionY, groupBookLayoutPositionX, groupBookLayoutPositionY;
        percentageOfLevelInSection = amountOfChaptersInLevel / sectionData.element.tags.amountOfChaptersInSection;
        levelScaleZ = percentageOfLevelInSection * sectionAvailableSpace;
        bookDesiredPositionZ = sectionData.isInExplodedView ? (sectionData.element.tags.desiredPositionZ + (bookData.elementInfo.explodedViewPosition.z * sectionData.element.tags.desiredExplodedViewScaleZ) - (levelScaleZ/2)) + (sectionData.element.masks.isOnTheGround ? StackSpacing.ExplodedViewSectionShadowPadding : 0)
                                                                : bookDesiredPositionZOnRegularView;
        bookInitialPositionZ = sectionData.isInExplodedView ? (sectionData.element.tags.desiredPositionZ + (sectionData.element.tags.desiredExplodedViewScaleZ/2)) : (bookDesiredPositionZ + 1);
        if(bookData.elementInfo.group)
        {
            const groupBookIndex = bookDataArr.indexOf(bookData);
            const bookLayout = layout[groupBookIndex];
            ({groupBookScaleX, groupBookScaleY, groupBookPositionX, groupBookPositionY, groupBookLayoutPositionX, groupBookLayoutPositionY} = GetGroupBookData(bookLayout, sectionPosition));
        }
        const book = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Book});
        const bookMod = {
            [dimension]                  : true,
            [dimension + "X"]            : groupBookPositionX ?? sectionPosition.x,
            [dimension + "Y"]            : groupBookPositionY ?? sectionPosition.y,
            [dimension + "Z"]            : bookInitialPositionZ,
            typeOfElement                : BibleElementType.Book,
            bookIndex                    : bookData.creationInfo.levelIndex,
            isBibleElement               : true,
            arrangementIndex             : bookData.creationInfo.arrangementIndex,
            testamentIndex               : bookData.creationInfo.testamentIndex,
            sectionIndex                 : bookData.creationInfo.sectionIndex,
            // sectionName                  : bookData.creationInfo.sectionKey,
            bookName                     : bookData.elementInfo.commonName,
            label                        : bookData.elementInfo.commonName,
            labelColor                   : bookData.creationInfo.levelIndex < Math.floor(bookData.creationInfo.levelsLenght/2) ? "#FFFFFF" : "#000000",
            labelOpacity                 : 0,
            numberOfChapters,
            explodedViewPosition         : bookData.elementInfo.explodedViewPosition,
            explodedViewCustomScale      : bookData.elementInfo.explodedViewCustomScale ?? null,
            isGroupBook                  : bookData.elementInfo.group ? true : null,
            groupId                      : bookData.elementInfo.group ?? null,
            groupBookIndex               : bookData.elementInfo.group ? bookData.creationInfo.bookLevelIndex : null,
            draggable                    : thisBot.masks.areBibleElementsDraggable,
            layoutPositionX              : groupBookLayoutPositionX,
            layoutPositionY              : groupBookLayoutPositionY,
            desiredPositionZ             : bookDesiredPositionZ,
            scaleX                       : bookScalesOnMod.x,
            scaleY                       : bookScalesOnMod.y,
            scaleZ                       : bookScalesOnMod.z,
            initialScaleX                : groupBookScaleX ?? StackElementMeasurements.BookScales.x,
            initialScaleY                : groupBookScaleY ?? StackElementMeasurements.BookScales.y,
            initialScaleZ                : levelScaleZ,
            hoveredScaleX                : (groupBookScaleX ?? StackElementMeasurements.BookScales.x) + StackElementMeasurements.AditionalBookScaleOnHover,
            hoveredScaleY                : (groupBookScaleY ?? StackElementMeasurements.BookScales.y) + StackElementMeasurements.AditionalBookScaleOnHover,
            desiredScaleZ                : levelScaleZ,
            transformer                  : bibleData ? bibleData.staticBibleElements.bibleTransformer.id : null,
            transformerLink              : bibleData ? `🔗${bibleData.staticBibleElements.bibleTransformer.id}` : null,
            color                        : bookData.elementInfo.customColor ?? levelsColors[bookDataIndex],
            strokeColor                  : "clear",
            orginalColor                 : bookData.elementInfo.customColor ?? levelsColors[bookDataIndex],
            initialColor                 : bookData.elementInfo.customColor ?? levelsColors[bookDataIndex],
            labelTextColor               : bookData.elementInfo.customLabelColor ?? levelsColors[Math.round(levelsColors.length * 0.4) - 1],
            layoutBookDirectionNormalized: bookData.elementInfo.group ? new Vector3(groupBookLayoutPositionX, groupBookLayoutPositionY, 0).normalize() : null,
            bookInfo                     : bookData.elementInfo,
            singleBooksScales            : StackElementMeasurements.BookScales,
            isCheckpointPlatform         : bookData.elementInfo.isCheckpoint,
            collisionType
        };
        book.OnSpawned({mod: bookMod});
        console.log(`SelectSection`, {book: {...book}})
        bookData.element = book;
        bookData.isActive = true;
        if(InstanceManager.masks.isInHistoryMode) setTagMask(book, "color", GetHistoryColor({element: book}))

        if(sectionData.isInExplodedView && bookData.element.tags.explodedViewCustomScale)
        {
            bookData.currentShape = BookShapeType.ExplodedViewCustomShape;
        }
    }
    if(!sectionData.isInExplodedView)
    {
        bookDesiredPositionZOnRegularView += (levelScaleZ + StackSpacing.BetweenBooks)
    }
}

bibleElements = getBots(byTag("isBibleElement", true), byTag("isInUse", true));
StacksManager.TrySetElementsRenderOrder(bibleElements);
fixedBooksData = sectionData.childrenData.flat().toReversed();
for(let bookData of fixedBooksData)
{

    const bookDataIndex = fixedBooksData.indexOf(bookData);
    setTagMask(bookData.element, "pointable", false);
    if(isInstantaneous) bookData.element.AnimateToDesiredPosition({isInstantaneous})
    else
    {
        thirdSequenceAnimations.push(
            os.sleep(timeBetweenBookAnimation * bookDataIndex)
            .then(async () => {
                await bookData.element.AnimateToDesiredPosition({speedMultiplier, isInstantaneous})
                .then(() => {
                    setTagMask(bookData.element, "highlightable", true);
                    setTagMask(bookData.element, "pointable", true);
                })
            })
        )
    }
}
if(!isInstantaneous) await Promise.all(thirdSequenceAnimations);

StacksManager.TrySetElementsRenderOrder(bibleElements);

return Promise.all(shout("OnSectionSelectionAnimationComplete", {sectionData, speedMultiplier, isInstantaneous}));

function GetElementsAboveSection()
{
    let elements = [];
    const sectionDataIndex = testamentData ? testamentData.childrenData.indexOf(sectionData) : null;
    if(bibleData)
    {        
        for(let i = testamentData.creationInfo.testamentIndex; i < bibleData.childrenData.length; i++)
        {
            const currentTestamentData = bibleData.childrenData[i];
            if(currentTestamentData.isSplitIntoSections)
            {
                for(let currentSectionData of currentTestamentData.childrenData)
                {
                    const currentSectionDataIndex = currentTestamentData.childrenData.indexOf(currentSectionData);
                    if(i < testamentData.creationInfo.testamentIndex || (i === testamentData.creationInfo.testamentIndex && currentSectionDataIndex <= sectionDataIndex)) continue;
                    if(currentSectionData.isSplitIntoBooks)
                    {
                        for(let bookData of currentSectionData.childrenData.flat())
                        {
                            if(bookData.isActive)
                            {
                                elements.push(bookData.element);
                            }
                        }
                    }
                    else if(currentSectionData.isActive)
                    {
                        elements.push(currentSectionData.element);
                    }
                }
            }
            else if(currentTestamentData.isActive)
            {
                if(i <= testamentData.creationInfo.testamentIndex) continue;
                elements.push(currentTestamentData.element);
            }
        }
    }
    else if(testamentData)
    {        
        for(let currentSectionData of testamentData.childrenData)
        {
            const currentSectionDataIndex = testamentData.childrenData.indexOf(currentSectionData);
            if(currentSectionDataIndex <= sectionDataIndex) continue;
            if(currentSectionData.isSplitIntoBooks)
            {
                for(let bookData of currentSectionData.childrenData.flat())
                {
                    if(bookData.isActive)
                    {
                        elements.push(bookData.element);
                    }
                }
            }
            else if(currentSectionData.isActive)
            {
                elements.push(currentSectionData.element);
            }
        }
    }
    return elements;
}