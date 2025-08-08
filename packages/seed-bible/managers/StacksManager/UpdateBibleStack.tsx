/**
 * Updates the Bible stack by adjusting the position of elements based on the current state of the Bible.
 * Animates the covers, testaments, and the cross within the stack, using the provided speed multiplier for smooth transitions.
 *
 * @param {Object} that - The object containing `bibleData` and `speedMultiplier`.
 * @param {BibleData} that.bibleData - The Bible data to be updated.
 * @param {number} that.speedMultiplier - The speed multiplier used to adjust the animation duration.
 * @returns {Promise<boolean>} Resolves once all animations are completed.
 *
 * @example
 * StacksManager.UpdateBibleStack({ bibleData: someBibleData, speedMultiplier: 2 });
 */

const {bibleData, speedMultiplier, isInstantaneous} = that;
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : (0.5/speedMultiplier);
const easing = {type: "sinusoidal", mode: "inout"};
const lowerCoverPosition = getBotPosition(bibleData.staticBibleElements.lowerCover, dimension);
const lowerCoverScales = GetBotScales(bibleData.staticBibleElements.lowerCover);
const upperCoverScales = GetBotScales(bibleData.staticBibleElements.upperCover);
const isBibleEmpty = IsBibleEmpty();
const isCrossInMiddle = bibleData.childrenData.every((testamentData) => {return testamentData.isSplitIntoSections}) && !isBibleEmpty;
const animations = [];
let crossNewPositionZ = null;
const targetCrossPosition='';
const stackStructure = GetBibleStackStructure();
const initialPositionZ = lowerCoverPosition.z + lowerCoverScales.z
let nextPositionZ = initialPositionZ;

if(!isBibleEmpty)
{
    nextPositionZ += StackSpacing.BetweenArrangements;
    for(const testamentData of stackStructure)
    {
        const {testamentDeltaPositionZ, newTestamentAnimations} = HandleTestamentDataInStack({isInstantaneous, testamentData, desiredPositionZ: nextPositionZ, dimension, duration, easing, speedMultiplier});
        animations.push(...newTestamentAnimations)
        nextPositionZ += testamentDeltaPositionZ;
        if(isCrossInMiddle && stackStructure.indexOf(testamentData) === 0)
        {
            crossNewPositionZ = nextPositionZ + (StackSpacing.BetweenArrangements/2)
        }
        nextPositionZ += StackSpacing.BetweenArrangements;
    }
}

if (!isCrossInMiddle)
{
    crossNewPositionZ = isBibleEmpty ? (initialPositionZ + upperCoverScales.z) : (nextPositionZ + StackSpacing.CoverToCross);
}

targetCrossPosition = isCrossInMiddle ? CrossPosition.Middle : CrossPosition.Top;

if(bibleData.currentCrossPosition !== targetCrossPosition)
{
    bibleData.currentCrossPosition = targetCrossPosition;

    if(isInstantaneous)
    {
        setTagMask([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], "formOpacity", 1);
    }
    else
    {
        animations.push(
            animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], "formOpacity", {
                toValue: 0,
                duration: duration / 2,
                easing
            }).then(() => {
                setTagMask([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", crossNewPositionZ);
                return animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], "formOpacity", {
                    toValue: 1,
                    duration: duration / 2,
                    easing
                });
            })
        );
    }
} 
else
{
    if(!isInstantaneous)
    {
        animations.push(
            animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", {
                toValue: crossNewPositionZ,
                duration,
                easing
            })
        );
    }
}

if(isInstantaneous)
{
    setTagMask([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", crossNewPositionZ);
    setTagMask(bibleData.staticBibleElements.upperCover, dimension + "Z", isBibleEmpty ? initialPositionZ : nextPositionZ);
}
else
{
    animations.push(
        animateTag(bibleData.staticBibleElements.upperCover, dimension + "Z", {
            toValue: isBibleEmpty ? initialPositionZ : nextPositionZ,
            duration,
            easing
        })
    )
}

await Promise.allSettled(animations);

return true;

function IsBibleEmpty()
{
    const result = !bibleData.childrenData.some((testamentData) => {
        return testamentData.isSplitIntoSections ? (testamentData.childrenData.some((sectionData) => {
            return sectionData.isSplitIntoBooks ? true : sectionData.isActive
        })) : testamentData.isActive
    })
    return result;
}

function GetBibleStackStructure()
{
    const filteredStructure = bibleData.childrenData.filter((testamentData) => {
        return testamentData.isSplitIntoSections ? (testamentData.childrenData.some((sectionData) => {
            return sectionData.isSplitIntoBooks ? true : sectionData.isActive
        })) : testamentData.isActive
    })
    return filteredStructure;
}