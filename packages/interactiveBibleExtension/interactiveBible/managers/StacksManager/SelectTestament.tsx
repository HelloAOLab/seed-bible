/**
    * Handles a testament selection. It modify the data of the selected testament on the bibleStructure,
    * then divides it into sections and resposition the rest of the elements if needed
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.testament - The testament to divide into sections
    * @example
    * thisBot.SelectTestament({testament});
*/

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"

const {testament, speedMultiplier = 1, isInstantaneous = false} = that;
const testamentData = thisBot.GetBibleElementData({element: testament});
const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: testamentData.parentDataIds});
const dimension = os.getCurrentDimension();
const animationsDuration = isInstantaneous ? 0 : (1 / speedMultiplier);
const animationsEasing = {type: "sinusoidal", mode: "inout"};
const currentInfoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(testamentData.element)));
const testamentPosition = getBotPosition(testament, dimension);
const testamentScales = GetBotScales(testament);
const sectionInitialScaleZ = 0.1;
const desiredTestamentScale = 1.1;
const desiredTestamentFormOpacity = 0;
let sectionPosition = testamentPosition;
let sectionDesiredPositionZ = testamentPosition.z + StackSpacing.BetweenSections;
let crossLines;
let crossLinesPosition;
let sectionShadows;
let elementsAboveTestament;
const collisionType = bibleData?.bibleType === BibleType.PlatformerGame ? CollisionType.Collision : null

InstanceManager.TryHideUsersNotificationOnElement({element: testament})
shout("OnTestamentSelected", {isFromPlatformerGame: (bibleData && bibleData.bibleType === BibleType.PlatformerGame)});
setTagMask(thisBot, "isBibleAnimating", true);
if(thisBot.vars.highlightedElements.length > 0 && bibleData)
{
    const elementsToUnhighlight = thisBot.vars.highlightedElements.map((element) => {return thisBot.GetBibleElementData({element})})
        .filter((elementData) => {
        return  elementData.parentDataIds.bibleId                   &&
                elementData.parentDataIds.bibleId === bibleData.id  &&
                !elementData.element.masks.isOnTheGround            && 
                !elementData.element.masks.isUnhighlighting
        })
        .map((elementData) => {return elementData.element})
    if(elementsToUnhighlight.length > 0)
    {
        await Promise.all(elementsToUnhighlight.map((element) => {
            return thisBot.TryUnhighlightElement({element, tryUpdateUsersNotification: (element.id == testament.id ? false : true), requestSource: StackElementInteractionType.Transition})
        }));
        thisBot.vars.highlightedElements = SubtractArrays(thisBot.vars.highlightedElements, elementsToUnhighlight)
    }
}
thisBot.vars.lastInteractedTestamentData = testamentData;
testamentData.isSplitIntoSections = true;
testamentData.childrenData.forEach((data) => {
    data.isInsideBible = testamentData.isInsideBible;
    data.isInsideTestament = true;
})

shout("OnBibleElementSelected", {element: testament})

if(bibleData)
{
    crossLines = [bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine];
    crossLinesPosition = getBotPosition(crossLines[0], dimension);
    sectionShadows = thisBot.vars.sectionsData.filter((currentSectionData) => {
        return currentSectionData.parentDataIds.bibleId === bibleData.id && 
            currentSectionData.shadow &&
            currentSectionData.shadow.tags.isInUse &&
            currentSectionData.shadow.tags[dimension + 'Z'] > testamentPosition.z
        }
    ).map((currentSectionData) => {return currentSectionData.shadow})
    elementsAboveTestament = [bibleData.staticBibleElements.upperCover].concat(sectionShadows, crossLinesPosition.z > testamentPosition.z ? crossLines : [], GetElementsAboveTestament());
    sectionPosition = new Vector3(0, 0, testamentPosition.z);
}
if(currentInfoLabelTransformer)
{
    await currentInfoLabelTransformer.Hide({isInstantaneous}).then(() => {
        ObjectPooler.ReleaseObject({obj: currentInfoLabelTransformer, tag: currentInfoLabelTransformer.tags.poolTag});
    })
}

for(let data of testamentData.childrenData)
{
    const sectionIndex = testamentData.childrenData.indexOf(data);
    const desiredScaleZ = data.creationInfo.amountOfChaptersInSection * StackElementMeasurements.SectionDesiredScaleZRatio;
    const section = ObjectPooler.GetObjectFromPool({tag: data instanceof SectionBookData ? ObjectPoolTags.Book : ObjectPoolTags.Section});
    const sectionMod = {
        typeOfElement               : data instanceof SectionBookData ? BibleElementType.SectionBook : BibleElementType.Section,
        arrangementIndex            : data.creationInfo.arrangementIndex,
        testamentIndex              : data.creationInfo.testamentIndex,
        sectionIndex                : data.creationInfo.sectionIndex,
        // sectionKey                  : data.creationInfo.sectionKey,
        sectionName                 : data.elementInfo.name,
        amountOfChaptersInSection   : data.creationInfo.amountOfChaptersInSection,
        numberOfChapters            : data instanceof SectionBookData ? data.creationInfo.amountOfChaptersInSection : null,
        bookInfo                    : data instanceof SectionBookData ? data.elementInfo.books[0] : null,
        bookName                    : data instanceof SectionBookData ? data.elementInfo.books[0].commonName : null,
        [dimension]                 : true,
        [dimension + "X"]           : sectionPosition.x,
        [dimension + "Y"]           : sectionPosition.y,
        [dimension + "Z"]           : sectionPosition.z,
        [dimension + "RotationZ"]   : 0,
        scaleX                      : StackElementMeasurements.SectionScales.x,
        scaleY                      : StackElementMeasurements.SectionScales.y,
        scaleZ                      : sectionInitialScaleZ,
        initialScaleX               : StackElementMeasurements.SectionScales.x,
        initialScaleY               : StackElementMeasurements.SectionScales.y,
        hoveredScaleX               : (StackElementMeasurements.SectionScales.x) + StackElementMeasurements.SectionAditionalScaleOnHover,
        hoveredScaleY               : (StackElementMeasurements.SectionScales.y) + StackElementMeasurements.SectionAditionalScaleOnHover,
        initialScaleZ               : desiredScaleZ,
        color                       : data.highlightColor ?? data.elementInfo.color,
        orginalColor                : data.elementInfo.color,
        initialColor                : data.elementInfo.color,
        initialExplodedViewScaleZ   : data instanceof SectionBookData ? null : desiredScaleZ * (data.elementInfo.customExplodedViewScaleFactor ?? 2),
        desiredExplodedViewScaleZ   : data instanceof SectionBookData ? null : desiredScaleZ * (data.elementInfo.customExplodedViewScaleFactor ?? 2),
        labelOpacity                : 0,
        formOpacity                 : 0.7,
        labelTextColor              : GetDarkerColor(data.elementInfo.color),
        transformer                 : bibleData ? bibleData.staticBibleElements.bibleTransformer.id : null,
        transformerLink             : bibleData ? `🔗${bibleData.staticBibleElements.bibleTransformer.id}` : null,
        customColorRange            : data instanceof SectionBookData ? null : data.elementInfo.customColorRange,
        draggable                   : StacksManager.masks.areBibleElementsDraggable,
        desiredPositionZ            : sectionDesiredPositionZ,
        desiredScaleZ,
        sectionIndex,
        collisionType               : (data instanceof SectionBookData) ? collisionType : null 
    };
    section.OnSpawned({mod: sectionMod});
    data.element = section;
    data.isActive = true;
    sectionDesiredPositionZ += (StackSpacing.BetweenSections + sectionMod.desiredScaleZ);
    if(InstanceManager.masks.isInHistoryMode) setTagMask(section, "color", GetHistoryColor({element: section}))
}

const activeBibleElements = getBots(byTag("isBibleElement", true), byTag('isInUse', true));
try
{
    const sectionsDesiredScaleZ = testamentData.childrenData.map((data) => {return data.element.tags.desiredScaleZ});
    const testamentDesiredScaleZ = sectionsDesiredScaleZ.reduce((accumulator, currentValue) => {return (accumulator + currentValue)}) + ((testamentData.childrenData.length+1) * StackSpacing.BetweenSections);
    const deltaScaleZ = testamentDesiredScaleZ - testamentScales.z;
    
    let firstAnimationSequence = [];
    if(isInstantaneous) setTagMask(testamentData.element, "scaleZ", testamentDesiredScaleZ);
    else
    {
        const focusOnRotation = {x: 1.01229, y:0.5};
        const testamentPosition = getBotPosition(testamentData.element, dimension);
        let fixedPosition = new Vector3(testamentPosition.x, testamentPosition.y, testamentPosition.z + (testamentDesiredScaleZ/2))
        if(testamentData.parentDataIds.bibleId)
        {
            const transformerPosition = getBotPosition(testamentData.element.links.transformerLink, dimension);
            fixedPosition = fixedPosition.add(transformerPosition);
        }
        const desiredFocusOnPosition = GetFocusOnPositionFromRotation(
            focusOnRotation.y, 
            focusOnRotation.x, 
            fixedPosition
        );

        firstAnimationSequence.push(
            animateTag(testamentData.element, "scaleZ", {
                toValue: testamentDesiredScaleZ,
                duration: animationsDuration,
                easing: animationsEasing
            }),
            os.focusOn({x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y}, {
                duration: animationsDuration,
                easing: {type: "sinusoidal", mode: "inout"},
                rotation: focusOnRotation,
                zoom: 8
            })
        );
    }
    
    if(bibleData)
    {
        elementsAboveTestament.forEach((element) => {
            const elementPosition = getBotPosition(element, dimension);
            const elementDesiredPositionZ = elementPosition.z + deltaScaleZ;
            if(element.tags.isBibleElement) setTag(element, "desiredPositionZ", elementDesiredPositionZ);
            if(isInstantaneous) setTagMask(element, dimension + "Z", elementDesiredPositionZ);
            else firstAnimationSequence.push(
                animateTag(element, dimension + "Z", {
                    toValue: elementDesiredPositionZ,
                    duration: animationsDuration,
                    easing: animationsEasing
                })
            )
        })
    }

    if(!isInstantaneous) await Promise.allSettled(firstAnimationSequence);

    testamentData.childrenData.forEach((data) => {
        setTagMask(data.element, "scaleZ", data.element.tags.desiredScaleZ);
        setTagMask(data.element, dimension + "Z", data.element.tags.desiredPositionZ);
        setTagMask(data.element, "highlightable", true);
    });
    StacksManager.TrySetElementsRenderOrder(activeBibleElements);
    if(isInstantaneous)
    {
        setTagMask(testament, "scale", desiredTestamentScale);
        setTagMask(testament, "formOpacity", desiredTestamentFormOpacity);
    }
    else
    {
        await animateTag(testament, {
            fromValue: {
                scale: testament.tags.scale,
                formOpacity: testament.tags.formOpacity
            },
            toValue: {
                scale: desiredTestamentScale,
                formOpacity: desiredTestamentFormOpacity
            },
            duration: animationsDuration,
            easing: animationsEasing
        })
    }
}
catch(error){console.error(error)}

StacksManager.TrySetElementsRenderOrder(activeBibleElements);
setTagMask(testament, 'color', 'clear');
setTagMask(testament, 'pointable', false);

return Promise.all(shout("OnTestamentSelectionAnimationComplete", {testamentData, speedMultiplier, isInstantaneous}));

function GetElementsAboveTestament()
{
    let elements = [];
    for(let i = (testament.tags.testamentIndex+1); i < bibleData.childrenData.length; i++)
    {
        const currentTestamentData = bibleData.childrenData[i];
        if(currentTestamentData.isSplitIntoSections)
        {
            for(let currentSectionData of currentTestamentData.childrenData)
            {
                if(currentSectionData.isSplitIntoBooks)
                {
                    for(let currentBookData of currentSectionData.childrenData.flat())
                    {
                        if(currentBookData.isActive)
                        {
                            elements.push(currentBookData.element);
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
            elements.push(currentTestamentData.element);
        }
    }
    return elements;
}
