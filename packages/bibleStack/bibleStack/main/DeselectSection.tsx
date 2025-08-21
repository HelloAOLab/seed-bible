/**
    * This function handles the deselection and animation of a section, 
    * resetting the visual state and attributes of the section and its children pieces.
    *
    * @param {Object} that - Object that contains important data for the function.
    * @param {StackSectionData} that.sectionData - Data related to the section being deselected, including children pieces and animations.
    * @returns {Promise<void>} - Resolves when the deselection and animation process completes.
    * @throws {Error} - Throws an error if any animation or state update fails.
    * @example
    * thisBot.DeselectSection({sectionData: someSectionData})
*/

setTagMask(thisBot, 'isBibleAnimating', true);
const {sectionData} = that;
const dimension = os.getCurrentDimension();
const sectionShadowPosition = getBotPosition(sectionData.shadow, dimension);
const sectionDesiredScale = 1;
const sectionDesiredFormOpacity = 1;
const duration = 0.5;
const easing = {type: 'sinusoidal', mode: 'inout'}
const infoLabelTransformer = BibleVizUtils.Functions.GetCurrentInfoLabelTransformer({ownerBot: sectionData.shadow});
const selectedBooksData = sectionData.childrenData.flat().filter((bookData) => {return bookData.isActive && bookData.isSelected})

thisBot.vars.lastInteractedStackSectionData = sectionData;

if(thisBot.vars.highlightedPieces.length > 0)
{
    const piecesToUnhighlight = sectionData.childrenData.flat().filter((bookData) => {
        return bookData.isActive && thisBot.vars.highlightedPieces.some((piece) => {return piece.id === bookData.piece.id})
    }).map((bookData) => {return bookData.piece})
    if(piecesToUnhighlight.length > 0)
    {
        await Promise.all(piecesToUnhighlight.map((piece) => {
            return thisBot.TryUnhighlightPiece({piece, requestSource: BibleVizUtils.Data.tags.InteractionType.Transition});
        }));
        thisBot.vars.highlightedPieces = BibleVizUtils.Functions.SubtractArrays({array1: thisBot.vars.highlightedPieces, array2: piecesToUnhighlight})
    }
}
if(selectedBooksData.length > 0)
{
    selectedBooksData.forEach((bookData) => {
        bookData.isSelected = false;
        setTagMask(bookData.piece, "pointable", true);
        setTagMask(bookData.piece, "highlightable", true);
    })
    await thisBot.UpdateStacks();
}
const sectionShadowScales = BibleVizUtils.Functions.GetBotScales(sectionData.shadow);
const sectionInitialScales = {x: sectionShadowScales.x * 1.1, y: sectionShadowScales.y * 1.1, z: sectionShadowScales.z * 1.1}
const deltaScaleZ = sectionInitialScales.z - sectionShadowScales.z;
const sectionInitialPosition = new Vector3(sectionShadowPosition.x, sectionShadowPosition.y, sectionShadowPosition.z - (deltaScaleZ/2));

setTagMask(sectionData.piece, dimension + 'X', sectionInitialPosition.x);
setTagMask(sectionData.piece, dimension + 'Y', sectionInitialPosition.y);
setTagMask(sectionData.piece, dimension + 'Z', sectionInitialPosition.z);
setTagMask(sectionData.piece, 'scale', sectionDesiredScale);
setTagMask(sectionData.piece, 'scaleX', sectionInitialScales.x);
setTagMask(sectionData.piece, 'scaleY', sectionInitialScales.y);
setTagMask(sectionData.piece, 'scaleZ', sectionInitialScales.z);
// setTag(sectionData.piece, dimension, true);
setTagMask(sectionData.piece, 'color', BibleVizUtils.Data.masks.isInHistoryMode ? BibleVizUtils.Functions.GetHistoryColor({piece: sectionData.piece}) : (sectionData.highlightColor ?? sectionData.pieceInfo.color));
setTagMask(sectionData.piece, 'pointable', true);

await animateTag(sectionData.piece, {
    fromValue: {
        [dimension + 'Z']: sectionInitialPosition.z,
        scaleX: sectionInitialScales.x,
        scaleY: sectionInitialScales.y,
        scaleZ: sectionInitialScales.z,
        formOpacity: sectionData.piece.tags.formOpacity
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
    if(bookData.piece)
    {
        ObjectPooler.ReleaseObject({obj: bookData.piece, tag: bookData.piece.tags.poolTag});
        bookData.piece = null;
    }
    bookData.isActive = false;
    bookData.isSelected = false;
    bookData.queuedChapterData = null;
    bookData.currentSelectedChapterData = null;
    bookData.currentShape = null;
})

await thisBot.UpdateStacks();
setTagMask(thisBot, 'isBibleAnimating', false);

BibleVizUtils.Functions.UpdateUsersNotificationOnPieces({piecesData: [sectionData]})