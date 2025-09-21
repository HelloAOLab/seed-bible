const {piecesData, manager} = that;

if(!manager.vars.tabsContext) return;

const dimension = os.getCurrentDimension();
const fixedElementsData = piecesData.filter((currPieceData) => {
    // const {bibleData} = BibleStackManager.GetDataChainFromParentDataIds({parentDataIds: currPieceData.parentDataIds});
    return currPieceData.piece && currPieceData.piece.tags[dimension] == true // && (bibleData && bibleData.bibleType === BibleType.PlatformerGame)
})

for(const pieceData of fixedElementsData)
{
    const pieceActivity = thisBot.GetActivityForPiece({piece: pieceData.piece, tabsContext: manager.vars.tabsContext});
    let isPieceSelected = false;
    const relativeDirection = BibleVizUtils.Functions.GetDirectionForNotification();
    let direction;
    
    switch(true)
    {
        case pieceData instanceof StackTestamentData:
            direction = relativeDirection;
            isPieceSelected = pieceData.isSplitIntoSections;
        break;
        case pieceData instanceof StackSectionData:
            direction = relativeDirection;
            isPieceSelected = pieceData.isSplitIntoBooks;
        break;
        case pieceData instanceof StackSectionBookData:
        case pieceData instanceof StackBookData:
            direction = relativeDirection;
            isPieceSelected = pieceData.currentShape == BibleVizUtils.Data.tags.BookShapeType.Selected;
        break;
        case pieceData instanceof StackChapterData:
        case pieceData instanceof LayoutChapterData:
            direction = new Vector2(1, -1);
            isPieceSelected = pieceData.piece.masks.isExpanded;
        break;
    }

    if(
        (pieceData instanceof StackChapterData) && // To show activity notification only in chapters
        pieceActivity.length > 0 && 
        !isPieceSelected &&
        pieceData.piece.tags.isInUse && 
        !pieceData.piece.masks.isHighlighting && 
        (/*!(pieceData instanceof StackChapterData) ||*/ !pieceData.piece.masks.isHighlighted || pieceData.isSelected)
    )
    {
        const formOpacity = pieceActivity.some((activity) => {return manager.vars.tabsContext.activeTab === activity.id;}) ? 1 : 0.5;
        const label = pieceActivity.length > 1 ? pieceActivity.length : "";
        const color = BibleVizUtils.Data.tags.dumbUserPresenceData.find((dumbData) => { return dumbData.tab === pieceActivity[0]})?.user?.color ?? BibleVizUtils.Data.tags.myUserColor;

        if(pieceData.piece.links.activityNotification)
        {
            setTag(pieceData.piece.links.activityNotification, "label", label)
            setTag(pieceData.piece.links.activityNotification, "formOpacity", formOpacity);
            setTag(pieceData.piece.links.activityNotification, "color", color);
        }
        else if(!pieceData.piece.masks.isHighlighting && !pieceData.piece.masks.isHighlighted)
        {
            const activityNotification = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.ActivityNotification});
            const activityNotificationMod = {
                [dimension]: true,
                label,
                ownerBotId: pieceData.piece.id,
                formOpacity,
                direction,
                color
            }
            activityNotification.OnSpawned({mod: activityNotificationMod});
            activityNotification.SetPosition({setX: true, setY: true, setZ: true});
            pieceData.piece.tags.activityNotification = `🔗${activityNotification.id}`
        }
    }
    else thisBot.TryHideActivityNotificationOnPiece({piece: pieceData.piece});
}