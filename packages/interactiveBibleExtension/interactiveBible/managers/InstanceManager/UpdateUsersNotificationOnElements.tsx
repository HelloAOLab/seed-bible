import {TestamentData} from "interactiveBible.managers.StacksManager.TestamentData"
import {SectionData} from "interactiveBible.managers.StacksManager.SectionData"
import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"
import {BookData} from "interactiveBible.managers.StacksManager.BookData"
import {ChapterData} from "interactiveBible.managers.StacksManager.ChapterData"
import {MapChapterData} from "interactiveBible.managers.MapsManager.MapChapterData"

const {elementsData} = that;
const dimension = os.getCurrentDimension();
const fixedElementsData = elementsData.filter((currElementData) => {
    // const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: currElementData.parentDataIds});
    return currElementData.element && currElementData.element.tags[dimension] == true // && (bibleData && bibleData.bibleType === BibleType.PlatformerGame)
})

fixedElementsData.forEach((elementData) => {
    const elementSelections = thisBot.GetUsersSelectionForElement({element: elementData.element}).filter((userSelection) => {
        return userSelection.userId != getID(configBot)
    })
    let isElementSelected = false;
    switch(true)
    {
        case elementData instanceof TestamentData:
            isElementSelected = elementData.isSplitIntoSections
        break;
        case elementData instanceof SectionData:
            isElementSelected = elementData.isSplitIntoBooks
        break;
        case elementData instanceof SectionBookData:
        case elementData instanceof BookData:
            isElementSelected = elementData.currentShape == BookShapeType.Selected
        break;
        case elementData instanceof ChapterData:
        case elementData instanceof MapChapterData:
            isElementSelected = elementData.element.masks.isExpanded
        break;
    }

    if(elementSelections.length > 0 && 
        !isElementSelected &&
        elementData.element.tags.isInUse && 
        !elementData.element.masks.isHighlighting && 
        !elementData.element.masks.isHighlighted)
    {
        if(elementData.element.links.usersNotification)
        {
            setTag(elementData.element.links.usersNotification, "label", elementSelections.length)
        }
        else if(!elementData.element.masks.isHighlighting && !elementData.element.masks.isHighlighted)
        {
            const usersNotification = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.UsersNotification});
            const usersNotificationMod = {
                [dimension]: true,
                label: elementSelections.length,
                ownerBotId: elementData.element.id
            }
            usersNotification.OnSpawned({mod: usersNotificationMod});
            usersNotification.SetPosition({setX: true, setY: true, setZ: true});
            elementData.element.tags.usersNotification = `🔗${usersNotification.id}`
        }
    }
    else thisBot.TryHideUsersNotificationOnElement({element: elementData.element});
})
