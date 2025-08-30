import {StackTestamentData} from "bibleVizUtils.classes.StackTestamentData"
import {StackSectionData} from "bibleVizUtils.classes.StackSectionData"
import {StackSectionBookData} from "bibleVizUtils.classes.StackSectionBookData"
import {StackBookData} from "bibleVizUtils.classes.StackBookData"
import {StackChapterData} from "bibleVizUtils.classes.StackChapterData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"

const {piecesData} = that;
const dimension = os.getCurrentDimension();
const fixedElementsData = piecesData.filter((currElementData) => {
    // const {bibleData} = BibleStackManager.GetDataChainFromParentDataIds({parentDataIds: currElementData.parentDataIds});
    return currElementData.piece && currElementData.piece.tags[dimension] == true // && (bibleData && bibleData.bibleType === BibleType.PlatformerGame)
})

fixedElementsData.forEach((pieceData) => {
    const pieceSelections = thisBot.GetUsersSelectionForPiece({piece: pieceData.piece}).filter((userSelection) => {
        return userSelection.userId != getID(configBot)
    })
    let isElementSelected = false;
    switch(true)
    {
        case pieceData instanceof StackTestamentData:
            isElementSelected = pieceData.isSplitIntoSections
        break;
        case pieceData instanceof StackSectionData:
            isElementSelected = pieceData.isSplitIntoBooks
        break;
        case pieceData instanceof StackSectionBookData:
        case pieceData instanceof StackBookData:
            isElementSelected = pieceData.currentShape == BibleVizUtils.Data.tags.BookShapeType.Selected
        break;
        case pieceData instanceof StackChapterData:
        case pieceData instanceof LayoutChapterData:
            isElementSelected = pieceData.piece.masks.isExpanded
        break;
    }

    if(pieceSelections.length > 0 && 
        !isElementSelected &&
        pieceData.piece.tags.isInUse && 
        !pieceData.piece.masks.isHighlighting && 
        !pieceData.piece.masks.isHighlighted)
    {
        if(pieceData.piece.links.usersNotification)
        {
            setTag(pieceData.piece.links.usersNotification, "label", pieceSelections.length)
        }
        else if(!pieceData.piece.masks.isHighlighting && !pieceData.piece.masks.isHighlighted)
        {
            const usersNotification = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.UsersNotification});
            const usersNotificationMod = {
                [dimension]: true,
                label: pieceSelections.length,
                ownerBotId: pieceData.piece.id
            }
            usersNotification.OnSpawned({mod: usersNotificationMod});
            usersNotification.SetPosition({setX: true, setY: true, setZ: true});
            pieceData.piece.tags.usersNotification = `🔗${usersNotification.id}`
        }
    }
    else thisBot.TryHideUsersNotificationOnPiece({piece: pieceData.piece});
})
