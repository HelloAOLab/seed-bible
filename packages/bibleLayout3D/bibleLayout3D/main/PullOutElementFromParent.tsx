import {LayoutBookData} from "bibleLayout3D.main.LayoutBookData"
import {LayoutChapterData} from "bibleLayout3D.main.LayoutChapterData"
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
        NullifyMapBookParentIds(elementData, [nullifiableIds.layoutId]);
        const layoutBookStructure = thisBot.GetBookStructureByChild({layoutBookData: elementData})
        layoutBookStructure.layoutBookData = elementDataCopy
    }
    break;
    case elementData instanceof LayoutChapterData: {
        NullifyMapChapterParentIds(elementData, [nullifiableIds.layoutId, nullifiableIds.layoutBookId])
        elementDataIndex = layoutBookData.childrenData.indexOf(elementData);
        layoutBookData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    default: break;
}

return Promise.all(shout('OnStackElementPulledOut'));

function NullifyMapBookParentIds(layoutBookData, idsToNullify)
{
    NullifyParentIdsOnData(layoutBookData, idsToNullify);
    layoutBookData.childrenData.forEach((chapterData) => {NullifyMapChapterParentIds(chapterData, idsToNullify);})
}

function NullifyMapChapterParentIds(chapterData, idsToNullify)
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