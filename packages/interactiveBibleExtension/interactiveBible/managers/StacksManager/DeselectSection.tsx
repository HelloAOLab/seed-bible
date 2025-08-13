/**
    * This function handles the deselection and animation of a section, 
    * resetting the visual state and attributes of the section and its children elements.
    *
    * @param {Object} that - Object that contains important data for the function.
    * @param {SectionData} that.sectionData - Data related to the section being deselected, including children elements and animations.
    * @returns {Promise<void>} - Resolves when the deselection and animation process completes.
    * @throws {Error} - Throws an error if any animation or state update fails.
    * @example
    * StacksManager.DeselectSection({sectionData: someSectionData})
*/

setTagMask(thisBot, 'isBibleAnimating', true);
const {sectionData} = that;
const dimension = os.getCurrentDimension();
const sectionShadowPosition = getBotPosition(sectionData.shadow, dimension);
const sectionDesiredScale = 1;
const sectionDesiredFormOpacity = 1;
const duration = 0.5;
const easing = {type: 'sinusoidal', mode: 'inout'}
const infoLabelTransformer = GetCurrentInfoLabelTransformer(sectionData.shadow);
const selectedBooksData = sectionData.childrenData.flat().filter((bookData) => {return bookData.isActive && bookData.isSelected})

thisBot.vars.lastInteractedSectionData = sectionData;

if(thisBot.vars.highlightedElements.length > 0)
{
    const elementsToUnhighlight = sectionData.childrenData.flat().filter((bookData) => {
        return bookData.isActive && thisBot.vars.highlightedElements.some((element) => {return element.id === bookData.element.id})
    }).map((bookData) => {return bookData.element})
    if(elementsToUnhighlight.length > 0)
    {
        await Promise.all(elementsToUnhighlight.map((element) => {
            return thisBot.TryUnhighlightElement({element, requestSource: StackElementInteractionType.Transition});
        }));
        thisBot.vars.highlightedElements = SubtractArrays(thisBot.vars.highlightedElements, elementsToUnhighlight)
    }
}
if(selectedBooksData.length > 0)
{
    selectedBooksData.forEach((bookData) => {
        bookData.isSelected = false;
        setTagMask(bookData.element, "pointable", true);
        setTagMask(bookData.element, "highlightable", true);
    })
    await thisBot.UpdateStacks();
}
const sectionShadowScales = GetBotScales(sectionData.shadow);
const sectionInitialScales = {x: sectionShadowScales.x * 1.1, y: sectionShadowScales.y * 1.1, z: sectionShadowScales.z * 1.1}
const deltaScaleZ = sectionInitialScales.z - sectionShadowScales.z;
const sectionInitialPosition = new Vector3(sectionShadowPosition.x, sectionShadowPosition.y, sectionShadowPosition.z - (deltaScaleZ/2));

setTagMask(sectionData.element, dimension + 'X', sectionInitialPosition.x);
setTagMask(sectionData.element, dimension + 'Y', sectionInitialPosition.y);
setTagMask(sectionData.element, dimension + 'Z', sectionInitialPosition.z);
setTagMask(sectionData.element, 'scale', sectionDesiredScale);
setTagMask(sectionData.element, 'scaleX', sectionInitialScales.x);
setTagMask(sectionData.element, 'scaleY', sectionInitialScales.y);
setTagMask(sectionData.element, 'scaleZ', sectionInitialScales.z);
// setTag(sectionData.element, dimension, true);
setTagMask(sectionData.element, 'color', InstanceManager.masks.isInHistoryMode ? GetHistoryColor({element: sectionData.element}) : (sectionData.highlightColor ?? sectionData.elementInfo.color));
setTagMask(sectionData.element, 'pointable', true);

await animateTag(sectionData.element, {
    fromValue: {
        [dimension + 'Z']: sectionInitialPosition.z,
        scaleX: sectionInitialScales.x,
        scaleY: sectionInitialScales.y,
        scaleZ: sectionInitialScales.z,
        formOpacity: sectionData.element.tags.formOpacity
    },
    toValue: {
        [dimension + 'Z']: sectionShadowPosition.z,
        scaleX: sectionShadowScales.x,
        scaleY: sectionShadowScales.y,
        scaleZ: sectionShadowScales.z,
        formOpacity: sectionDesiredFormOpacity
    },
    duration,
    easing
})

if(infoLabelTransformer) await infoLabelTransformer.Hide().then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})})
ObjectPooler.ReleaseObject({obj: sectionData.shadow, tag: sectionData.shadow.tags.poolTag})
sectionData.isSplitIntoBooks = false;
sectionData.isInExplodedView = false;
sectionData.shadow = null;
sectionData.childrenData.flat().forEach((bookData) => {
    if(bookData.element)
    {
        ObjectPooler.ReleaseObject({obj: bookData.element, tag: bookData.element.tags.poolTag});
        bookData.element = null;
    }
    bookData.isActive = false;
    bookData.isSelected = false;
    bookData.queuedChapterData = null;
    bookData.currentSelectedChapterData = null;
    bookData.currentShape = null;
})

await thisBot.UpdateStacks();
setTagMask(thisBot, 'isBibleAnimating', false);

InstanceManager.UpdateUsersNotificationOnElements({elementsData: [sectionData]})