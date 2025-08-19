import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"
const {elementData, layoutData, layoutBookData} = that;
const elementDataCopy = await CreateDataCopy(elementData);
let elementDataIndex;

const nullifiableIds = {
    layoutId: 'layoutId',
    layoutBookId: 'layoutBookId',
}

elementData.element.tags.toErase = true;

switch(true)
{
    case elementData instanceof LayoutBookData: {
        NullifyBookParentIds(elementData, [nullifiableIds.layoutId]);
        const layoutBookStructure = thisBot.GetBookStructureByChild({layoutBookData: elementData})
        layoutBookStructure.layoutBookData = elementDataCopy
    }
    break;
    case elementData instanceof LayoutChapterData: {
        NullifyChapterParentIds(elementData, [nullifiableIds.layoutId, nullifiableIds.layoutBookId])
        elementDataIndex = layoutBookData.childrenData.indexOf(elementData);
        layoutBookData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    default: break;
}

// Stack? Shouldn't be Layout?
return Promise.all(shout('OnStackElementPulledOut'));

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
            copy = await thisBot.CreateBook({bookInfo: data.elementInfo, layoutData});
        }
        break;
        case data instanceof LayoutChapterData:
        {
            copy = await thisBot.CreateChapter({chapterInfo: data.elementInfo, layoutData, layoutBookData});
        }
        break;
        default: break;
    }
    return copy;
}