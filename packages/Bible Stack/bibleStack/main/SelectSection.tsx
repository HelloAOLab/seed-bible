/**
    * Handles a section selection. It modify the data of the selected section on the bibleStructure,
    * then divides it into books and resposition the rest of the pieces if needed
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.section - The section to divide intobooks
    * @example
    * thisBot.SelectSection({section});
*/

const {section, speedMultiplier = 1, isInstantaneous = false, skipTourGuide = false} = that;
const sectionData = thisBot.GetPieceData({piece: section});
const {bibleData, testamentData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});
const dimension = os.getCurrentDimension();
const easeInOutSine = {type: "sinusoidal", mode: "inout"};
const currentColorRGB = BibleVizUtils.Functions.HexToRgb({hexColor: sectionData.highlightColor ?? sectionData.piece.tags.orginalColor});
const colorRangeSize = sectionData.pieceInfo.customColorRange ?? 70;
const levelsColorRange = {
    min: [Math.max(currentColorRGB[0] - colorRangeSize, 0), Math.max(currentColorRGB[1] - colorRangeSize, 0), Math.max(currentColorRGB[2] - colorRangeSize, 0)],
    max: [Math.min(currentColorRGB[0] + colorRangeSize, 255), Math.min(currentColorRGB[1] + colorRangeSize, 255), Math.min(currentColorRGB[2] + colorRangeSize, 255)]
}
const sectionAvailableSpace = sectionData.piece.tags.desiredScaleZ - (BibleVizUtils.Data.tags.StackSpacing.BetweenBooks * (sectionData.childrenData.length + 1));
const firstSequenceAnimationsObjects = [];
const secondSequenceAnimationsObjects = [];
const thirdSequenceAnimations = [];
const cameraFocusDuration = 1;
const firstSequenceAnimationDuration =  isInstantaneous ? 0 : (0.4/speedMultiplier);
const secondSequenceAnimationDuration =  isInstantaneous ? 0 : (0.4/speedMultiplier);
const levelsColors = [];
const deltaRed = Math.floor((levelsColorRange.max[0] - levelsColorRange.min[0]) / sectionData.childrenData.length);
const deltaGreen = Math.floor((levelsColorRange.max[1] - levelsColorRange.min[1]) / sectionData.childrenData.length);
const deltaBlue = Math.floor((levelsColorRange.max[2] - levelsColorRange.min[2]) / sectionData.childrenData.length);
const timeBetweenBookAnimation =  isInstantaneous ? 0 : (50/speedMultiplier);
let bookDesiredPositionZOnRegularView;
let bookDesiredPositionZ;
let bookInitialPositionZ;
const bookScalesOnMod = {x: 0.1, y: 0.1, z: 0.1}
let piecesAboveSection = GetPiecesAboveSection();
const previousExplodedViewSectionData = (bibleData || testamentData) ? thisBot.GetPreviousExplodedViewSectionData({bibleData, testamentData}) : null;
// const collisionType = bibleData?.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? CollisionType.Collision : null;
BibleVizUtils.Functions.TryHideActivityNotificationOnPiece({piece: section})
setTagMask(thisBot, "isBibleAnimating", true);
shout("OnStackSectionSelected")
thisBot.PlaySound({soundName: "SectionOpen"});
if(thisBot.vars.highlightedPieces.length > 0)
{
    const piecesToUnhighlight = (bibleData || testamentData) ? thisBot.vars.highlightedPieces.map((piece) => {return thisBot.GetPieceData({piece})})
        .filter((pieceData) => {
            return  !pieceData.piece.masks.isOnTheGround    && 
                    !pieceData.piece.masks.isUnhighlighting &&
                    ((bibleData && pieceData.parentDataIds.stackBibleId && pieceData.parentDataIds.stackBibleId === bibleData.id) ||
                    (pieceData.parentDataIds.stackTestamentId && pieceData.parentDataIds.stackTestamentId === testamentData.id))
        })
        .map((pieceData) => {return pieceData.piece}) : [section]
    if(piecesToUnhighlight.length > 0)
    {
        await Promise.all(piecesToUnhighlight.map((piece) => {
            return thisBot.TryUnhighlightPiece({isInstantaneous, piece, tryUpdateActivityNotification: (piece.id == section.id ? false : true), requestSource: BibleVizUtils.Data.tags.InteractionType.Transition});
        }));
        thisBot.vars.highlightedPieces = BibleVizUtils.Functions.SubtractArrays({array1: thisBot.vars.highlightedPieces, array2: piecesToUnhighlight})
    }
}

if(previousExplodedViewSectionData && (!bibleData || bibleData.currentStackVizState === BibleVizUtils.Data.tags.BibleVisualizationState.Regular))
{
    previousExplodedViewSectionData.isInExplodedView = false;
    await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
}
const sectionPosition = getBotPosition(sectionData.piece, dimension);
sectionData.isSplitIntoBooks = true;
sectionData.isInExplodedView = true;
thisBot.vars.lastInteractedStackSectionData = sectionData;
sectionData.childrenData
    .flat()
    .forEach((bookData) => {
        bookData.isInsideBible = sectionData.isInsideBible;
        bookData.isInsideTestament = sectionData.isInsideTestament;
        bookData.isInsideSection = true;
    }
)
shout("OnBiblePieceSelected", {piece: section});

if(bibleData || testamentData)
{
    const sectionShadows = (bibleData || testamentData) ? thisBot.vars.stackSectionsData.filter((currentSectionData) => {
        return (bibleData ? (currentSectionData.parentDataIds.stackBibleId === bibleData.id) : (currentSectionData.parentDataIds.stackTestamentId === testamentData.id)) && 
            currentSectionData.shadow &&
            currentSectionData.shadow.tags.isInUse &&
            currentSectionData.shadow.tags[dimension + 'Z'] > sectionPosition.z
        }
    ).map((currentSectionData) => {return currentSectionData.shadow}) : [];
    piecesAboveSection = piecesAboveSection.concat(sectionShadows);
    if(bibleData)
    {
        const crossLines = [bibleData.staticBiblePieces.crossVerticalLine, bibleData.staticBiblePieces.crossHorizontalLine];
        const crossLinesPosition = getBotPosition(crossLines[0], dimension);
        piecesAboveSection = piecesAboveSection.concat([bibleData.staticBiblePieces.upperCover], crossLinesPosition.z > sectionPosition.z ? crossLines : [])
    }
}

firstSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.piece,
        tag: dimension + "RotationZ",
        options: {
            toValue: -0.05235988,
            duration: (firstSequenceAnimationDuration / 4),
            easing: {type: "sinusoidal", mode: "in"}
        },
        then: new AnimateTagObject({
            bot: sectionData.piece,
            tag: dimension + "RotationZ",
            options: {
                toValue: 0.1308997,
                duration: (firstSequenceAnimationDuration / 4),
                easing: {type: "sinusoidal", mode: "out"}
            },
            then: new AnimateTagObject({
                bot: sectionData.piece,
                tag: dimension + "RotationZ",
                options: {
                    toValue: -0.05235988,
                    duration: (firstSequenceAnimationDuration / 4),
                    easing: {type: "sinusoidal", mode: "out"}
                },
                then: new AnimateTagObject({
                    bot: sectionData.piece,
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

const sectionNewPositionZ = sectionPosition.z + (sectionData.piece.masks.isOnTheGround ? 0 : BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionPadding);
if(sectionData.isInExplodedView)
{
    const deltaScaleZ = sectionData.piece.tags.desiredExplodedViewScaleZ - sectionData.piece.tags.desiredScaleZ;        
    let pieceCurrentPosition, pieceNewPositionZ;
    setTag(sectionData.piece, "desiredPositionZ", sectionNewPositionZ)
    firstSequenceAnimationsObjects.push(
        new AnimateTagObject({
            bot: sectionData.piece,
            tag: dimension + "Z",
            options: {
                toValue: sectionNewPositionZ,
                duration: firstSequenceAnimationDuration,
                easing: easeInOutSine

            }
        })
    )
    piecesAboveSection.forEach((piece) => {
        pieceCurrentPosition = getBotPosition(piece, dimension);
        pieceNewPositionZ = pieceCurrentPosition.z + deltaScaleZ + (BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionPadding*2);
        if(piece.tags.isStackPiece) setTag(piece, "desiredPositionZ", pieceNewPositionZ);
        firstSequenceAnimationsObjects.push(
            new AnimateTagObject({
                bot: piece,
                tag: dimension + "Z",
                options: {
                    toValue: pieceNewPositionZ,
                    duration: firstSequenceAnimationDuration,
                    easing: easeInOutSine
                }
            })
        )
    })
}
else
{
    bookDesiredPositionZOnRegularView = sectionData.piece.tags.desiredPositionZ + BibleVizUtils.Data.tags.StackSpacing.BetweenBooks;
}

firstSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.piece,
        tag: "scaleZ",
        options: {
            toValue: sectionData.piece.tags.desiredExplodedViewScaleZ,
            duration: firstSequenceAnimationDuration,
            easing: easeInOutSine
        }
    })
)
secondSequenceAnimationsObjects.push(
    new AnimateTagObject({
        bot: sectionData.piece,
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
    if(isInstantaneous) firstSequenceAnimationsObjects.forEach((setTagObject) => {BibleVizUtils.Functions.GetSetTagFromObject(setTagObject)})
    else
    {
        const focusOnRotation = {x: 1.01229, y:0.5};
        const sectionPosition = getBotPosition(sectionData.piece, dimension);
        let fixedPosition = new Vector3(sectionPosition.x, sectionPosition.y, sectionNewPositionZ + (sectionData.piece.tags.desiredExplodedViewScaleZ/2))
        if(sectionData.parentDataIds.stackBibleId)
        {
            const transformerPosition = getBotPosition(sectionData.piece.links.transformerLink, dimension);
            fixedPosition = fixedPosition.add(transformerPosition);
        }
        const desiredFocusOnPosition = BibleVizUtils.Functions.GetFocusOnPositionFromRotation({
            theta: focusOnRotation.y, 
            phi: focusOnRotation.x, 
            botPosition: fixedPosition
        });
        

        await Promise.allSettled([
            ...firstSequenceAnimationsObjects.map((animateTagObject) => {return BibleVizUtils.Functions.GetAnimateTagFromObject({obj: animateTagObject})}),
            os.focusOn({x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y}, {
                duration: cameraFocusDuration,
                easing: {type: "sinusoidal", mode: "inout"},
                rotation: focusOnRotation,
                zoom: 8
            })
        ])
    }
    
    if(isInstantaneous) secondSequenceAnimationsObjects.forEach((setTagObject) => {BibleVizUtils.Functions.GetSetTagFromObject(setTagObject)})
    else await Promise.all(secondSequenceAnimationsObjects.map((animateTagObject) => {return BibleVizUtils.Functions.GetAnimateTagFromObject({obj: animateTagObject})}))
    
    setTagMask(section, 'color', 'clear');
    setTagMask(section, 'pointable', false);
}
catch(error){console.error(error)}

for(let i = 0; i < sectionData.childrenData.length; i++)
{
    const levelColorRGB = [levelsColorRange.min[0] + (deltaRed * i), levelsColorRange.min[1] + (deltaGreen * i), levelsColorRange.min[2] + (deltaBlue * i)];
    const levelColorHex = BibleVizUtils.Functions.RgbToHex({rgbColor: levelColorRGB});
    levelsColors.push(levelColorHex);
}
for(const bookDataArr of sectionData.childrenData)
{
    const bookDataIndex = sectionData.childrenData.indexOf(bookDataArr);
    let percentageOfLevelInSection;
    let levelScaleZ;
    const amountOfChaptersInLevel = bookDataArr.reduce((total, bookData) => {
        const {numberOfChapters} = BibleVizUtils.Data.tags.booksStaticInfo[bookData.pieceInfo.commonName]; 
        return total + numberOfChapters
    }, 0);
    const layout = thisBot.GetLayoutForBooksGroup({amountOfBooks: bookDataArr.length});
    for(const bookData of bookDataArr)
    {
        const {numberOfChapters} = BibleVizUtils.Data.tags.booksStaticInfo[bookData.pieceInfo.commonName];
        let groupBookScaleX, groupBookScaleY, groupBookPositionX, groupBookPositionY, groupBookLayoutPositionX, groupBookLayoutPositionY;
        percentageOfLevelInSection = amountOfChaptersInLevel / sectionData.piece.tags.amountOfChaptersInSection;
        levelScaleZ = percentageOfLevelInSection * sectionAvailableSpace;
        bookDesiredPositionZ = sectionData.isInExplodedView ? (sectionData.piece.tags.desiredPositionZ + (bookData.pieceInfo.explodedViewPosition.z * sectionData.piece.tags.desiredExplodedViewScaleZ) - (levelScaleZ/2)) + (sectionData.piece.masks.isOnTheGround ? BibleVizUtils.Data.tags.StackSpacing.ExplodedViewSectionShadowPadding : 0)
                                                                : bookDesiredPositionZOnRegularView;
        bookInitialPositionZ = sectionData.isInExplodedView ? (sectionData.piece.tags.desiredPositionZ + (sectionData.piece.tags.desiredExplodedViewScaleZ/2)) : (bookDesiredPositionZ + 1);
        if(bookData.pieceInfo.group)
        {
            const groupBookIndex = bookDataArr.indexOf(bookData);
            const bookLayout = layout[groupBookIndex];
            ({groupBookScaleX, groupBookScaleY, groupBookPositionX, groupBookPositionY, groupBookLayoutPositionX, groupBookLayoutPositionY} = BibleVizUtils.Functions.GetGroupBookData({bookLayout, sectionPosition}));
        }
        const book = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackBook});
        const bookMod = {
            [dimension]                  : true,
            [dimension + "X"]            : groupBookPositionX ?? sectionPosition.x,
            [dimension + "Y"]            : groupBookPositionY ?? sectionPosition.y,
            [dimension + "Z"]            : bookInitialPositionZ,
            typeOfPiece                  : BibleVizUtils.Data.tags.BiblePieceType.StackBook,
            bookIndex                    : bookData.creationInfo.levelIndex,
            isStackPiece                 : true,
            arrangementIndex             : bookData.creationInfo.arrangementIndex,
            testamentIndex               : bookData.creationInfo.testamentIndex,
            sectionIndex                 : bookData.creationInfo.sectionIndex,
            // sectionName                  : bookData.creationInfo.sectionKey,
            bookName                     : bookData.pieceInfo.commonName,
            label                        : bookData.pieceInfo.commonName,
            labelColor                   : bookData.creationInfo.levelIndex < Math.floor(bookData.creationInfo.levelsLenght/2) ? "#FFFFFF" : "#000000",
            labelOpacity                 : 0,
            numberOfChapters,
            explodedViewPosition         : bookData.pieceInfo.explodedViewPosition,
            explodedViewCustomScale      : bookData.pieceInfo.explodedViewCustomScale ?? null,
            isGroupBook                  : bookData.pieceInfo.group ? true : null,
            groupId                      : bookData.pieceInfo.group ?? null,
            groupBookIndex               : bookData.pieceInfo.group ? bookData.creationInfo.bookLevelIndex : null,
            draggable                    : thisBot.masks.areBiblePiecesDraggable,
            layoutPositionX              : groupBookLayoutPositionX,
            layoutPositionY              : groupBookLayoutPositionY,
            desiredPositionZ             : bookDesiredPositionZ,
            scaleX                       : bookScalesOnMod.x,
            scaleY                       : bookScalesOnMod.y,
            scaleZ                       : bookScalesOnMod.z,
            initialScaleX                : groupBookScaleX ?? BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.x,
            initialScaleY                : groupBookScaleY ?? BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.y,
            initialScaleZ                : levelScaleZ,
            hoveredScaleX                : (groupBookScaleX ?? BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.x) + BibleVizUtils.Data.tags.StackPieceMeasurements.AditionalBookScaleOnHover,
            hoveredScaleY                : (groupBookScaleY ?? BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales.y) + BibleVizUtils.Data.tags.StackPieceMeasurements.AditionalBookScaleOnHover,
            desiredScaleZ                : levelScaleZ,
            transformer                  : bibleData ? bibleData.staticBiblePieces.bibleTransformer.id : null,
            transformerLink              : bibleData ? `🔗${bibleData.staticBiblePieces.bibleTransformer.id}` : null,
            color                        : bookData.pieceInfo.customColor ?? levelsColors[bookDataIndex],
            strokeColor                  : "clear",
            orginalColor                 : bookData.pieceInfo.customColor ?? levelsColors[bookDataIndex],
            initialColor                 : bookData.pieceInfo.customColor ?? levelsColors[bookDataIndex],
            labelTextColor               : bookData.pieceInfo.customLabelColor ?? levelsColors[Math.round(levelsColors.length * 0.4) - 1],
            layoutBookDirectionNormalized: bookData.pieceInfo.group ? new Vector3(groupBookLayoutPositionX, groupBookLayoutPositionY, 0).normalize() : null,
            bookInfo                     : bookData.pieceInfo,
            singleBooksScales            : BibleVizUtils.Data.tags.StackPieceMeasurements.BookScales,
            isCheckpointPlatform         : bookData.pieceInfo.isCheckpoint,
            // collisionType
        };
        book.OnSpawned({mod: bookMod});
        bookData.piece = book;
        bookData.isActive = true;
        if(BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(book, "color", BibleVizUtils.Functions.GetHistoryColor({piece: book}))

        if(sectionData.isInExplodedView && bookData.piece.tags.explodedViewCustomScale)
        {
            bookData.currentShape = BibleVizUtils.Data.tags.BookShapeType.ExplodedViewCustomShape;
        }
    }
    if(!sectionData.isInExplodedView)
    {
        bookDesiredPositionZOnRegularView += (levelScaleZ + BibleVizUtils.Data.tags.StackSpacing.BetweenBooks)
    }
}

const biblePieces = getBots(byTag("isStackPiece", true), byTag("isInUse", true));
thisBot.TrySetPiecesRenderOrder(biblePieces);
const fixedBooksData = sectionData.childrenData.flat().toReversed();
for(const bookData of fixedBooksData)
{

    const bookDataIndex = fixedBooksData.indexOf(bookData);
    setTagMask(bookData.piece, "pointable", false);
    if(isInstantaneous) bookData.piece.AnimateToDesiredPosition({isInstantaneous})
    else
    {
        thirdSequenceAnimations.push(
            os.sleep(timeBetweenBookAnimation * bookDataIndex)
            .then(async () => {
                await bookData.piece.AnimateToDesiredPosition({speedMultiplier, isInstantaneous})
                .then(() => {
                    setTagMask(bookData.piece, "highlightable", true);
                    setTagMask(bookData.piece, "pointable", true);
                })
            })
        )
    }
}
if(!isInstantaneous) await Promise.all(thirdSequenceAnimations);

thisBot.TrySetPiecesRenderOrder(biblePieces);

return Promise.all(shout("OnStackSectionSelectionAnimationComplete", {sectionData, speedMultiplier, isInstantaneous, skipTourGuide}));

function GetPiecesAboveSection()
{
    const pieces = [];
    const sectionDataIndex = testamentData ? testamentData.childrenData.indexOf(sectionData) : null;
    if(bibleData)
    {        
        for(let i = testamentData.creationInfo.testamentIndex; i < bibleData.childrenData.length; i++)
        {
            const currentTestamentData = bibleData.childrenData[i];
            if(currentTestamentData.isSplitIntoSections)
            {
                for(const currentSectionData of currentTestamentData.childrenData)
                {
                    const currentSectionDataIndex = currentTestamentData.childrenData.indexOf(currentSectionData);
                    if(i < testamentData.creationInfo.testamentIndex || (i === testamentData.creationInfo.testamentIndex && currentSectionDataIndex <= sectionDataIndex)) continue;
                    if(currentSectionData.isSplitIntoBooks)
                    {
                        for(const bookData of currentSectionData.childrenData.flat())
                        {
                            if(bookData.isActive)
                            {
                                pieces.push(bookData.piece);
                            }
                        }
                    }
                    else if(currentSectionData.isActive)
                    {
                        pieces.push(currentSectionData.piece);
                    }
                }
            }
            else if(currentTestamentData.isActive)
            {
                if(i <= testamentData.creationInfo.testamentIndex) continue;
                pieces.push(currentTestamentData.piece);
            }
        }
    }
    else if(testamentData)
    {        
        for(const currentSectionData of testamentData.childrenData)
        {
            const currentSectionDataIndex = testamentData.childrenData.indexOf(currentSectionData);
            if(currentSectionDataIndex <= sectionDataIndex) continue;
            if(currentSectionData.isSplitIntoBooks)
            {
                for(const bookData of currentSectionData.childrenData.flat())
                {
                    if(bookData.isActive)
                    {
                        pieces.push(bookData.piece);
                    }
                }
            }
            else if(currentSectionData.isActive)
            {
                pieces.push(currentSectionData.piece);
            }
        }
    }
    return pieces;
}