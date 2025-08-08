/**
    * Gets the reference of the elements on the Bible and performs a close animation with a given duration and easing.
    * Currently active elements like Testaments, sections, Books, Upper cover, etc, 
    * animates its scaleZ and position on the Z axis so the Bible looks like its closing
    * 
    * @param {Object} that - Object that contains important data for the function
    * @param {Number} that.duration - The duration of the animation
    * @param {Object} that.easing - The easing of the animation
    * @param {String} that.easing.type - The type of easing
    * @param {String} that.easing.mode - The mode of easing
    * @example
    * thisBot.CloseBible({duration: 1, easing: {type: "sinusoidal", mode: "inout"}})
*/

import {SectionData} from 'managers.StacksManager.SectionData'
import {SectionBookData} from 'managers.StacksManager.SectionBookData'

shout("OnBibleClose");
const {duration = 0.5, easing = {type: "sinusoidal", mode: "inout"}, bibleData} = that ?? {};
const dimension = os.getCurrentDimension();
const testaments = bibleData.childrenData
    .filter((testamentData) => {return testamentData.isActive && !testamentData.isSplitIntoSections})
    .map((testamentData) => {return testamentData.element});
const sectionsData = bibleData.childrenData
    .filter((testamentData) => {return testamentData.isSplitIntoSections})
    .flatMap((testamentData) => {return testamentData.childrenData})
    .filter((sectionData) => {return sectionData.isActive && !sectionData.isSplitIntoBooks})
const sections = sectionsData.map((sectionData) => {return sectionData.element});
const booksData = bibleData.childrenData
    .filter((testamentData) => {return testamentData.isSplitIntoSections})
    .flatMap((testamentData) => {return testamentData.childrenData})
    .filter((sectionData) => {return sectionData instanceof SectionData && sectionData.isSplitIntoBooks})
    .flatMap((sectionData) => {return sectionData.childrenData})
    .flat()
    .filter((bookData) => {return bookData.isActive})
const books = booksData.map((bookData) => {return bookData.element});
const sectionShadows = bibleData.childrenData.flatMap((testamentData) => {return testamentData.childrenData}).filter((sectionData) => {return sectionData.isActive && sectionData.shadow}).map((sectionData) => {return sectionData.shadow});
const lowerCoverPosition = getBotPosition(bibleData.staticBibleElements.lowerCover, dimension);
const lowerCoverScales = GetBotScales(bibleData.staticBibleElements.lowerCover);
const upperCoverClosedPositionZ = lowerCoverPosition.z + lowerCoverScales.z;
const crossClosedPositionZ = upperCoverClosedPositionZ;
const bibleElements = testaments.concat(sections, books);
const elementsToShrink = bibleElements.concat(sectionShadows);
const desiredElementsScaleZ = 0;
const selectedBooksLabelTransformers = [
        ...booksData.filter((bookData) => {return bookData.isSelected}), 
        ...sectionsData.filter((sectionData) => {return sectionData.isSelected && (sectionData instanceof SectionBookData)})
    ]
    .map((selectedBookData) => {return getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(selectedBookData.element.id), byTag('isInUse', true)));})
    .filter((labelTransformer) => {return labelTransformer})


shout("HideChapters", {bibleId: bibleData.id});
setTagMask(bibleElements, "pointable", false);

await Promise.allSettled([
    ...bibleElements.map((bibleElement) => {return StacksManager.TryUnhighlightElement({element: bibleElement, requestSource: StackElementInteractionType.Transition})}),
    ...selectedBooksLabelTransformers.map((labelTransformer) => {
        return labelTransformer.Hide().then(() => {ObjectPooler.ReleaseObject({obj: labelTransformer, tag: labelTransformer.tags.poolTag})})
    })]
);

if(elementsToShrink.length > 0)
{
    try
    {
        await Promise.all(elementsToShrink.map((element) => {
            const elementPosition = getBotPosition(element, dimension);
            const elementScales = GetBotScales(element);
            return animateTag(element, {
                fromValue: {
                    [dimension + 'Z']: elementPosition.z,
                    scaleZ: elementScales.z
                },
                toValue: {
                    [dimension + 'Z']: upperCoverClosedPositionZ,
                    scaleZ: desiredElementsScaleZ
                },
                duration,
                easing
            })
        }).concat(
            animateTag(bibleData.staticBibleElements.upperCover, dimension + "Z",  {
                toValue: upperCoverClosedPositionZ,
                duration,
                easing
            }),
            animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", {
                toValue: crossClosedPositionZ,
                duration,
                easing
            })
        )).then(() => {
            setTagMask(thisBot, "isBibleClosed", true);

            elementsToShrink.forEach((element) => {
                if(element.tags.OnReleased)
                {
                    element.OnReleased();
                }
                else
                {
                    StacksManager.HideObject({bot: element})
                }
            })
            if(sectionShadows.length > 0)
            {
                sectionShadows.forEach((element) => {
                    ReleaseLabelTransformerFromElement(element);
                    ObjectPooler.ReleaseObject({obj: element, tag: element.tags.poolTag});
                })
            }
        })
    }
    catch(error){console.error(error)}
}

return true;