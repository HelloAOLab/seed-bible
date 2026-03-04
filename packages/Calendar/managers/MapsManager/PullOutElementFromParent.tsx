import {MapBookData} from "managers.MapsManager.MapBookData"
import {MapChapterData} from "managers.MapsManager.MapChapterData"
const {elementData, mapData, mapBookData} = that;
let elementDataCopy = await CreateDataCopy(elementData);
let elementDataIndex;

const nullifiableIds = {
    mapId: 'mapId',
    mapBookId: 'mapBookId',
}

elementData.element.tags.toErase = true;

switch(true)
{
    case elementData instanceof MapBookData: {
        NullifyMapBookParentIds(elementData, [nullifiableIds.mapId]);
        const mapBookStructure = thisBot.GetMapBookStructureByChild({mapBookData: elementData})
        mapBookStructure.mapBookData = elementDataCopy
    }
    break;
    case elementData instanceof MapChapterData: {
        NullifyMapChapterParentIds(elementData, [nullifiableIds.mapId, nullifiableIds.mapBookId])
        elementDataIndex = mapBookData.childrenData.indexOf(elementData);
        mapBookData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    default: break;
}

return Promise.all(shout('OnStackElementPulledOut'));

function NullifyMapBookParentIds(mapBookData, idsToNullify)
{
    NullifyParentIdsOnData(mapBookData, idsToNullify);
    mapBookData.childrenData.forEach((mapChapterData) => {NullifyMapChapterParentIds(mapChapterData, idsToNullify);})
}

function NullifyMapChapterParentIds(mapChapterData, idsToNullify)
{
    NullifyParentIdsOnData(mapChapterData, idsToNullify);
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
        case data instanceof MapBookData: {
            copy = await thisBot.CreateMapBook({bookInfo: data.elementInfo, mapData});
        }
        break;
        case data instanceof MapChapterData:
        {
            copy = await thisBot.CreateMapChapter({chapterInfo: data.elementInfo, mapData, mapBookData});
        }
        break;
        default: break;
    }
    return copy;
}