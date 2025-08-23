/**
    * Opens the Bible by animating its elements and setting their properties based on the provided Bible data.
    * Initializes animations for the sections and adjusts their positions and scales.
    * @param {Object} that - The context containing properties for the Bible opening process.
    * @param {number} [that.duration=0.5] - The duration of the opening animation.
    * @param {Object} [that.easing={type: "sinusoidal", mode: "inout"}] - Easing configuration for the animation.
    * @param {BibleData} that.bibleData - The data related to the Bible being opened.
    * @example
    * bibleTransformer.OpenBible({duration: 1, easing: {type: "linear", mode: "inout"}, bibleData: someBibleData})
*/

import {StackSectionBookData} from 'bibleVizUtils.classes.StackSectionBookData'

const {duration = 0.5, easing = {type: "sinusoidal", mode: "inout"}, bibleData} = that ?? {};
const dimension = os.getCurrentDimension();
const lowerCoverPosition = getBotPosition(bibleData.staticBibleElements.lowerCover, dimension);
const crossVerticalLineScales = BibleVizUtils.Functions.GetBotScales(bibleData.staticBibleElements.crossVerticalLine)
const sectionInitialScaleZ = 0;
const initialPositionZ = lowerCoverPosition.z + BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z;
let nextPositionZ = initialPositionZ + BibleVizUtils.Data.tags.StackSpacing.BetweenArrangements;
const resizeAnimations = [];
bibleData.currentStackVizState = BibleVizUtils.Data.tags.BibleVisualizationState.Regular;

for(const testamentData of bibleData.childrenData)
{
    nextPositionZ += BibleVizUtils.Data.tags.StackSpacing.BetweenSections;
    for(const sectionData of testamentData.childrenData)
    {
        const sectionIndex = testamentData.childrenData.indexOf(sectionData);
        const desiredScaleZ = sectionData.creationInfo.amountOfChaptersInSection * BibleVizUtils.Data.tags.StackPieceMeasurements.SectionDesiredScaleZRatio;
        
        const section = ObjectPooler.GetObjectFromPool({tag: sectionData instanceof StackSectionBookData ? BibleVizUtils.Data.tags.ObjectPoolTags.Book : BibleVizUtils.Data.tags.ObjectPoolTags.Section});
        const sectionMod = {
            typeOfElement               : sectionData instanceof StackSectionBookData ? BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook : BibleVizUtils.Data.tags.BiblePieceType.StackSection,
            arrangementIndex            : sectionData.creationInfo.arrangementIndex,
            testamentIndex              : sectionData.creationInfo.testamentIndex,
            sectionIndex                : sectionData.creationInfo.sectionIndex,
            sectionName                 : sectionData.elementInfo.name,
            amountOfChaptersInSection   : sectionData.creationInfo.amountOfChaptersInSection,
            numberOfChapters            : sectionData instanceof StackSectionBookData ? sectionData.creationInfo.amountOfChaptersInSection : null,
            bookInfo                    : sectionData instanceof StackSectionBookData ? sectionData.elementInfo.books[0] : null,
            bookName                    : sectionData instanceof StackSectionBookData ? sectionData.elementInfo.books[0].commonName : null,
            [dimension]                 : true,
            [dimension + "X"]           : 0,
            [dimension + "Y"]           : 0,
            [dimension + "Z"]           : initialPositionZ,
            [dimension + "RotationZ"]   : 0,
            scaleX                      : BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.x,
            scaleY                      : BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.y,
            scaleZ                      : sectionInitialScaleZ,
            initialScaleX               : BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.x,
            initialScaleY               : BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.y,
            initialScaleZ               : desiredScaleZ,
            hoveredScaleX               : (BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.x) + BibleVizUtils.Data.tags.StackPieceMeasurements.SectionAditionalScaleOnHover,
            hoveredScaleY               : (BibleVizUtils.Data.tags.StackPieceMeasurements.SectionScales.y) + BibleVizUtils.Data.tags.StackPieceMeasurements.SectionAditionalScaleOnHover,
            color                       : sectionData.highlightColor ?? sectionData.elementInfo.color,
            orginalColor                : sectionData.elementInfo.color,
            initialColor                : sectionData.elementInfo.color,
            strokeColor                 : "clear",
            initialExplodedViewScaleZ   : sectionData instanceof StackSectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
            desiredExplodedViewScaleZ   : sectionData instanceof StackSectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
            labelOpacity                : 0,
            formOpacity                 : 0.7,
            labelTextColor              : GetDarkerColor(sectionData.elementInfo.color),
            transformer                 : thisBot.id,
            transformerLink             : `🔗${thisBot.id}`,
            customColorRange            : sectionData instanceof StackSectionBookData ? null : sectionData.elementInfo.customColorRange,
            draggable                   : BibleStackManager.masks.areBiblePiecesDraggable,
            desiredPositionZ            : nextPositionZ,
            desiredScaleZ,
            sectionIndex
        };
        section.OnSpawned({mod: sectionMod});
        sectionData.piece = section;
        sectionData.isActive = true;
        setTagMask(sectionData.piece, "formOpacity", 0.7);
        setTagMask(sectionData.piece, "highlightable", true);
        if(BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(section, "color", BibleVizUtils.Functions.GetHistoryColor({piece: section}))
        resizeAnimations.push(
            animateTag(sectionData.piece, {
                fromValue: {
                    [dimension + 'Z']: initialPositionZ,
                    scaleZ: sectionInitialScaleZ
                },
                toValue: {
                    [dimension + 'Z']: nextPositionZ,
                    scaleZ: desiredScaleZ
                },
                duration,
                easing
            })
        )
        nextPositionZ += (desiredScaleZ + BibleVizUtils.Data.tags.StackSpacing.BetweenSections);
    }
    nextPositionZ += BibleVizUtils.Data.tags.StackSpacing.BetweenArrangements
}

const crossOpenedPositionZ = bibleData.childrenData[bibleData.childrenData.length - 1].childrenData[0].piece.tags.desiredPositionZ - (BibleVizUtils.Data.tags.StackSpacing.BetweenArrangements / 2) - BibleVizUtils.Data.tags.StackSpacing.BetweenSections - (crossVerticalLineScales.z/2);
resizeAnimations.push(
    animateTag(bibleData.staticBibleElements.upperCover, dimension + "Z", {
        toValue: nextPositionZ,
        duration,
        easing: easing
    }),
    animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", {
        toValue: crossOpenedPositionZ,
        duration,
        easing: easing
    })
);

await Promise.allSettled(resizeAnimations);

setTagMask(thisBot, "isBibleClosed", false);

const activeBibleElements = getBots(byTag("isStackPiece", true), byTag(dimension, true));
BibleStackManager.TrySetPiecesRenderOrder(activeBibleElements);

return true;