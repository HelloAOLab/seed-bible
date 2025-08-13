/**
    * Called to determine if a section should make a tour guide
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.sectionData - The section data of the section to be checked
    * @example
    * StackManager.TryMakeTourGuidOnSection({sectionData});
*/

import {TourGuideData} from 'interactiveBible.managers.StacksManager.TourGuideData'
const {sectionData} = that;
if(thisBot.HasSectionEverBeenSelected({sectionData}))
{
    return false;
}
else
{
    const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});
    const dimension = os.getCurrentDimension();
    const focusOnRotation = {x: 1.01229, y:0.5};
    const initialCameraFocusDuration = 0.25;
    const delayBetweenBookHighlight = 250;
    const unhighlightDelay = 50;
    const sectionPosition = getBotPosition(sectionData.element, dimension);
    console.log(`[Debug] TryMakeTourGuideOnSection`, {bibleData, sectionData, transformerLink: sectionData?.element?.links?.transformerLink});
    const bibleTransformerPosition = bibleData && sectionData.parentDataIds.bibleId ? getBotPosition(sectionData.element.links.transformerLink, dimension) : new Vector3(0,0,0);
    const desiredFocusOnInitialPosition = GetFocusOnPositionFromRotation(focusOnRotation.y, focusOnRotation.x, new Vector3(sectionPosition.x + bibleTransformerPosition.x, sectionPosition.y + bibleTransformerPosition.y, sectionPosition.z + bibleTransformerPosition.z + (sectionData.element.tags.desiredScaleZ)));
    const desiredFocusOnFinalPosition = GetFocusOnPositionFromRotation(focusOnRotation.y, focusOnRotation.x, new Vector3(sectionPosition.x + bibleTransformerPosition.x, sectionPosition.y + bibleTransformerPosition.y, sectionPosition.z + bibleTransformerPosition.z));
    const easing = {type: "sinusoidal", mode: "inout"};
    const focusOnZoom = 6;
    const customUnhighlightDuration = 0.15;
    // sectionData.element.ReleaseCurrentInfoLabel();
    shout('MakePortalRestrict');
    setTagMask(thisBot, 'isASectionMakingTourGuide', true);
    thisBot.vars.sectionNamesEverSelected.push(sectionData.element.tags.sectionName);
    thisBot.vars.currentSectionMakingTourGuide = sectionData.element;

    try
    {
        await os.focusOn({x: desiredFocusOnInitialPosition.x, y: desiredFocusOnInitialPosition.y}, {
            duration: initialCameraFocusDuration,
            easing: easing,
            rotation: focusOnRotation,
            zoom: focusOnZoom
        }).then(() => {
            shout('OnTourGuideCameraFocusComplete')
            return new Promise((resolve, reject) => {
                const normalizedBooksData = sectionData.childrenData.flat().toReversed();
                let index = 0;
                const intervalId = setInterval(() => {
                    StacksManager.TryHighlightElement({element: normalizedBooksData[index].element, highlightRequestSource: StackElementInteractionType.Transition, unhighlightDelay, typeOfElement: BibleElementType.Book, customUnhighlightDuration});
                    shout('OnTourGuideBookHighlighted', {totalBooks: normalizedBooksData.length, currentBookIndex: index});
                    index++;

                    if (index >= normalizedBooksData.length)
                    {
                        clearInterval(intervalId);
                        thisBot.vars.currentTourGuideData = null;
                        resolve(Promise.all(shout('OnTourGuideComplete')));
                    }
                }, delayBetweenBookHighlight);
                os.focusOn({x: desiredFocusOnFinalPosition.x, y: desiredFocusOnFinalPosition.y}, {
                    duration: (delayBetweenBookHighlight/1000) * normalizedBooksData.length,
                    easing: easing,
                    rotation: focusOnRotation,
                    zoom: focusOnZoom
                }).catch((error) => {console.error(error)})
                thisBot.vars.currentTourGuideData = new TourGuideData({intervalId, promiseReject: reject})
            })
        })
    }
    catch(error)
    {
        return Promise.all(shout('OnTourGuideComplete'));
    }
}