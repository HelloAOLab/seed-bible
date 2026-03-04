/**
    * This tag is called whenever a chapter is interacted
    * It is in charge of managing whether to select, deselect, highlight, drag or drop a chapter if possible.
    * @param {Object} that - Object that contains important data for the function
    * @param {StackChapterData} that.chapterData - The chapterData that holds the reference to the chapter transformer, chapter front, chapter back, and some more important informati    * @param {ChapStringat.chaptypeOfInteractionhe Represents the type of interaction. Possible values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * shout("HandleChapterInteraction", {chapterData: someChapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Click});
*/

const {chapterData, typeOfInteraction, dragInfo, dropInfo} = that;
const {sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: chapterData.parentDataIds});
const actualData = sectionBookData ?? bookData;
if(thisBot.masks.isBibleAnimating) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
        {
            BibleVizUtils.Functions.HighlightBiblePiece({data: chapterData});
        }
        else
        {
            if(chapterData.isSelected)
            {
                if(!actualData && !chapterData.piece.masks.isDeselecting)
                {
                    thisBot.DeselectChapter({info: {chapterData}, setBibleAnimating: true});
                }
            }
            else
            {
                if(!chapterData.piece.masks.isSelecting)
                {
                    if(chapterData.piece.masks.isOnTheGround)
                    {
                        thisBot.TrySelectChapter({info: {chapterData}, bookData: actualData}).then(() => {thisBot.UserPresenceUpdate()});
                    }
                    else
                    {
                        const createNewTab = false;
                        if(createNewTab)
                        {
                            let tab = thisBot.vars.tabsContext.tabs.find((currTab) => {
                                return currTab.data.book === chapterData.piece.tags.parentBookName && currTab.data.chapter == chapterData.pieceInfo.number
                            })

                            if(!tab)
                            {
                                tab = {
                                    id: uuid(),
                                    taken: false,
                                    data: {
                                        use: 'thePage',
                                        type: 'book',
                                        book: chapterData.piece.tags.parentBookName,
                                        bookId: BibleVizUtils.Data.tags.booksStaticInfo[chapterData.piece.tags.parentBookName].abbreviation,
                                        chapter: chapterData.pieceInfo.number,
                                        translation: 'BSB'
                                    }
                                }
                                globalThis.AddTab(tab)
                            }
                            thisBot.vars.tabsContext.setActiveTab(tab.id);
                            globalThis.UpdateTab(tab);
                        }
                        else
                        {
                            let bookId = BibleVizUtils.Data.tags.booksStaticInfo[chapterData.piece.tags.parentBookName].abbreviation;
                            let chapter = chapterData.pieceInfo.number;

                            if(chapterData.piece.tags.parentBookName.includes("Psalms"))
                            {
                                ({chapter} = BibleVizUtils.Functions.ConvertDividedPsalmsToComplete({book: chapterData.piece.tags.parentBookName, chapter}))
                                bookId = "PSA";
                            }

                            thisBot.vars.tabsContext.navFunctions?.open?.(bookId, chapter)
                        }
                    }
                }
            }
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
    {
        thisBot.TryHighlightChapter({parentData: actualData, chapterData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
    {
        if(!chapterData.piece.masks.isBeingDragged    //&& 
            // chapterData.piece.masks.isOnTheGround     && 
            // !chapterData.piece.masks.isSelecting      &&
            // !chapterData.piece.masks.isDeselecting
        ) 
        {
            chapterData.piece.Unhighlight({chapterData}).then(() => {
                if(!chapterData.isSelected || !chapterData.piece.masks.isOnTheGround) BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({piecesData: [chapterData], manager: thisBot})
            });
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
        if(chapterData.piece.tags.draggable) shout("OnStackPieceDrag", {data: chapterData, piece: chapterData.piece});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Dragging:
    {
        if(chapterData.piece.tags.draggable) shout('OnStackPieceDragging', {piece: chapterData.piece, dragInfo, data: chapterData})
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        if(chapterData.piece.tags.draggable) shout('OnStackPieceDrop', {data: chapterData, piece: chapterData.piece, dropInfo});
    }
    break;
    default: break;
}