const {piecesData, manager} = that;

if(!manager.vars.tabsContext) return;

const dimension = os.getCurrentDimension();
const fixedElementsData = piecesData.filter((currElementData) => {
    // const {bibleData} = BibleStackManager.GetDataChainFromParentDataIds({parentDataIds: currElementData.parentDataIds});
    return currElementData.piece && currElementData.piece.tags[dimension] == true // && (bibleData && bibleData.bibleType === BibleType.PlatformerGame)
})

for(const pieceData of fixedElementsData)
{
    const pieceActivity = thisBot.GetActivityForPiece({piece: pieceData.piece, tabsContext: manager.vars.tabsContext});
    let isPieceSelected = false;
    switch(true)
    {
        case pieceData instanceof StackTestamentData:
            isPieceSelected = pieceData.isSplitIntoSections
        break;
        case pieceData instanceof StackSectionData:
            isPieceSelected = pieceData.isSplitIntoBooks
        break;
        case pieceData instanceof StackSectionBookData:
        case pieceData instanceof StackBookData:
            isPieceSelected = pieceData.currentShape == BibleVizUtils.Data.tags.BookShapeType.Selected
        break;
        case pieceData instanceof StackChapterData:
        case pieceData instanceof LayoutChapterData:
            isPieceSelected = pieceData.piece.masks.isExpanded
        break;
    }

    if(pieceActivity.length > 0 && 
        !isPieceSelected &&
        pieceData.piece.tags.isInUse && 
        !pieceData.piece.masks.isHighlighting && 
        !pieceData.piece.masks.isHighlighted)
    {
        const formOpacity = pieceActivity.some((activity) => {return manager.vars.tabsContext.activeTab === activity.id;}) ? 1 : 0.5;
        if(pieceData.piece.links.activityNotification)
        {
            setTag(pieceData.piece.links.activityNotification, "label", pieceActivity.length)
            setTag(pieceData.piece.links.activityNotification, "formOpacity", formOpacity);
        }
        else if(!pieceData.piece.masks.isHighlighting && !pieceData.piece.masks.isHighlighted)
        {
            const activityNotification = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.ActivityNotification});
            const activityNotificationMod = {
                [dimension]: true,
                label: pieceActivity.length,
                ownerBotId: pieceData.piece.id,
                formOpacity
            }
            activityNotification.OnSpawned({mod: activityNotificationMod});
            activityNotification.SetPosition({setX: true, setY: true, setZ: true});
            pieceData.piece.tags.activityNotification = `🔗${activityNotification.id}`
        }
    }
    else thisBot.TryHideActivityNotificationOnPiece({piece: pieceData.piece});
}