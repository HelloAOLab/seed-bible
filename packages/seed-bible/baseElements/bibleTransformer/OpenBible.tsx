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

import {SectionBookData} from 'managers.StacksManager.SectionBookData'

let {duration = 0.5, easing = {type: "sinusoidal", mode: "inout"}, bibleData} = that ?? {};
const dimension = os.getCurrentDimension();
const lowerCoverPosition = getBotPosition(bibleData.staticBibleElements.lowerCover, dimension);
const crossVerticalLineScales = GetBotScales(bibleData.staticBibleElements.crossVerticalLine)
const sectionInitialScaleZ = 0;
const initialPositionZ = lowerCoverPosition.z + StackElementMeasurements.CoverScales.z;
let activeBibleElements;
let crossOpenedPositionZ;
let nextPositionZ = initialPositionZ + StackSpacing.BetweenArrangements;
let resizeAnimations = [];
bibleData.currentStackVizState = BibleVisualizationState.Regular;

for(let testamentData of bibleData.childrenData)
{
    nextPositionZ += StackSpacing.BetweenSections;
    for(let sectionData of testamentData.childrenData)
    {
        const sectionIndex = testamentData.childrenData.indexOf(sectionData);
        const desiredScaleZ = sectionData.creationInfo.amountOfChaptersInSection * StackElementMeasurements.SectionDesiredScaleZRatio;
        
        const section = ObjectPooler.GetObjectFromPool({tag: sectionData instanceof SectionBookData ? ObjectPoolTags.Book : ObjectPoolTags.Section});
        const sectionMod = {
            typeOfElement               : sectionData instanceof SectionBookData ? BibleElementType.SectionBook : BibleElementType.Section,
            arrangementIndex            : sectionData.creationInfo.arrangementIndex,
            testamentIndex              : sectionData.creationInfo.testamentIndex,
            sectionIndex                : sectionData.creationInfo.sectionIndex,
            sectionName                 : sectionData.elementInfo.name,
            amountOfChaptersInSection   : sectionData.creationInfo.amountOfChaptersInSection,
            numberOfChapters            : sectionData instanceof SectionBookData ? sectionData.creationInfo.amountOfChaptersInSection : null,
            bookInfo                    : sectionData instanceof SectionBookData ? sectionData.elementInfo.books[0] : null,
            bookName                    : sectionData instanceof SectionBookData ? sectionData.elementInfo.books[0].commonName : null,
            [dimension]                 : true,
            [dimension + "X"]           : 0,
            [dimension + "Y"]           : 0,
            [dimension + "Z"]           : initialPositionZ,
            [dimension + "RotationZ"]   : 0,
            scaleX                      : StackElementMeasurements.SectionScales.x,
            scaleY                      : StackElementMeasurements.SectionScales.y,
            scaleZ                      : sectionInitialScaleZ,
            initialScaleX               : StackElementMeasurements.SectionScales.x,
            initialScaleY               : StackElementMeasurements.SectionScales.y,
            initialScaleZ               : desiredScaleZ,
            hoveredScaleX               : (StackElementMeasurements.SectionScales.x) + StackElementMeasurements.SectionAditionalScaleOnHover,
            hoveredScaleY               : (StackElementMeasurements.SectionScales.y) + StackElementMeasurements.SectionAditionalScaleOnHover,
            color                       : sectionData.highlightColor ?? sectionData.elementInfo.color,
            orginalColor                : sectionData.elementInfo.color,
            initialColor                : sectionData.elementInfo.color,
            strokeColor                 : "clear",
            initialExplodedViewScaleZ   : sectionData instanceof SectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
            desiredExplodedViewScaleZ   : sectionData instanceof SectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
            labelOpacity                : 0,
            formOpacity                 : 0.7,
            labelTextColor              : GetDarkerColor(sectionData.elementInfo.color),
            transformer                 : thisBot.id,
            customColorRange            : sectionData instanceof SectionBookData ? null : sectionData.elementInfo.customColorRange,
            draggable                   : StacksManager.masks.areBibleElementsDraggable,
            desiredPositionZ            : nextPositionZ,
            desiredScaleZ,
            sectionIndex
        };
        section.OnSpawned({mod: sectionMod});
        sectionData.element = section;
        sectionData.isActive = true;
        setTagMask(sectionData.element, "formOpacity", 0.7);
        setTagMask(sectionData.element, "highlightable", true);
        if(InstanceManager.masks.isInHistoryMode) setTagMask(section, "color", GetHistoryColor({element: section}))
        resizeAnimations.push(
            animateTag(sectionData.element, {
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
        nextPositionZ += (desiredScaleZ + StackSpacing.BetweenSections);
    }
    nextPositionZ += StackSpacing.BetweenArrangements
}

crossOpenedPositionZ = bibleData.childrenData[bibleData.childrenData.length - 1].childrenData[0].element.tags.desiredPositionZ - (StackSpacing.BetweenArrangements / 2) - StackSpacing.BetweenSections - (crossVerticalLineScales.z/2);
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

activeBibleElements = getBots(byTag("isBibleElement", true), byTag(dimension, true));
StacksManager.TrySetElementsRenderOrder(activeBibleElements);

return true;