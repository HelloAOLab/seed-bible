import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"
const {pieceData, layoutData, layoutBookData} = that;
const pieceDataCopy = await CreateDataCopy(pieceData);
let pieceDataIndex;

const nullifiableIds = {
    layoutId: 'layoutId',
    layoutBookId: 'layoutBookId',
}

pieceData.piece.tags.toErase = true;

switch(true)
{
    case pieceData instanceof LayoutBookData: {
        NullifyBookParentIds(pieceData, [nullifiableIds.layoutId]);
        const layoutBookStructure = thisBot.GetBookStructureByChild({layoutBookData: pieceData})
        layoutBookStructure.layoutBookData = pieceDataCopy
    }
    break;
    case pieceData instanceof LayoutChapterData: {
        NullifyChapterParentIds(pieceData, [nullifiableIds.layoutId, nullifiableIds.layoutBookId])
        pieceDataIndex = layoutBookData.childrenData.indexOf(pieceData);
        layoutBookData.childrenData.splice(pieceDataIndex, 1, pieceDataCopy);
    }
    break;
    default: break;
}

// Stack? Shouldn't be Layout?
return Promise.all(shout('OnStackPiecePulledOut'));

function NullifyBookParentIds(layoutBookData, idsToNullify)
{
    NullifyParentIdsOnData(layoutBookData, idsToNullify);
    layoutBookData.childrenData.forEach((chapterData) => {NullifyChapterParentIds(chapterData, idsToNullify);})
}

function NullifyChapterParentIds(chapterData, idsToNullify)
{
    NullifyParentIdsOnData(chapterData, idsToNullify);
}

function NullifyParentIdsOnData(data, idsToNullify)
{
    idsToNullify.forEach((idToNullify) => {data.parentDataIds[idToNullify] = null});
}

async function CreateDataCopy(data)
{
    let copy;
    switch(true)
    {
        case data instanceof LayoutBookData: {
            copy = await thisBot.CreateBook({bookInfo: data.pieceInfo, layoutData});
        }
        break;
        case data instanceof LayoutChapterData:
        {
            copy = await thisBot.CreateChapter({chapterInfo: data.pieceInfo, layoutData, layoutBookData});
        }
        break;
        default: break;
    }
    return copy;
}