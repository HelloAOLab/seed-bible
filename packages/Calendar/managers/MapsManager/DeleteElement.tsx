import {MapData} from "managers.MapsManager.MapData"
import {MapBookData} from "managers.MapsManager.MapBookData"
import {MapChapterData} from "managers.MapsManager.MapChapterData"
let {elementData, element} = that;
if(!elementData)
{
    if(element.tags.isMapCover)
    {
        elementData = thisBot.vars.mapsData.find((mapData) => {return mapData.id == element.tags.mapId});
    }
    else if(element.tags.isMapElement)
    {
        elementData = thisBot.GetMapElementData({element});
    }
}
if(elementData)
{
    switch(true)
    {
        case elementData instanceof MapData: 
            DeleteMap(elementData);
        break;
        case elementData instanceof MapBookData: 
            DeleteMapBook(elementData)
        break;
        case elementData instanceof MapChapterData: 
            DeleteMapChapter(elementData); 
        break;
        default: break;
    }
}
else console.warn('managers.StacksManager.DeleteElement. No element data found.')

function DeleteMapChapter(mapChapterData)
{
    const mapChapterDataIndex = thisBot.vars.mapChaptersData.indexOf(mapChapterData);
    if(mapChapterData.element)
    {
        InstanceManager.TryHideUsersNotificationOnElement({element: mapChapterData.element});
        if(mapChapterData.isSelected && Array.isArray(mapChapterData.element.vars.chunksOfVerses) && mapChapterData.element.vars.chunksOfVerses.length > 0)
        {
            mapChapterData.element.vars.chunksOfVerses.forEach((chunk) => {
                if(chunk.masks.isSelected && Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                {
                    chunk.vars.verses.flat().forEach((verse) => {ObjectPooler.ReleaseObject({obj: verse, tag: verse.tags.poolTag})})
                    chunk.vars.verses.splice(0, chunk.vars.verses.length);
                }
                ObjectPooler.ReleaseObject({obj: chunk, tag: chunk.tags.poolTag});
            })
            mapChapterData.element.vars.chunksOfVerses.splice(0, mapChapterData.element.vars.chunksOfVerses.length);
        }
        ObjectPooler.ReleaseObject({obj: mapChapterData.element, tag: mapChapterData.element.tags.poolTag});
        mapChapterData.element = null;
    }
    mapChapterData.elementInfo = null;
    mapChapterData.parentDataIds = null;
    mapChapterData.ResetData();
    if(mapChapterDataIndex >= 0) thisBot.vars.mapChaptersData.splice(mapChapterDataIndex, 1);
}

function DeleteMapBook(mapBookData)
{
    let mapBookDataIndex = thisBot.vars.mapBooksData.indexOf(mapBookData);
    mapBookData.childrenData.forEach((mapChapterData) => {DeleteMapChapter(mapChapterData)});
    mapBookData.childrenData.splice(0, mapBookData.childrenData.length);
    if(mapBookData.element)
    {
       
        ObjectPooler.ReleaseObject({obj: mapBookData.element, tag: mapBookData.element.tags.poolTag});
        mapBookData.element = null;
    }
    
    mapBookData.elementInfo = null;
    mapBookData.parentDataIds = null;
    mapBookData.creationInfo = null;

    if(mapBookDataIndex >= 0) thisBot.vars.mapBooksData.splice(mapBookDataIndex, 1);
}

function DeleteMap(mapData)
{
 
    let mapDataIndex = thisBot.vars.mapsData.indexOf(mapData);
    const staticMapElementsKeys = Object.keys(mapData.staticMapElements)
    mapData.childrenStructures
        .forEach((mapBookStructure) => {
            DeleteMapBook(mapBookStructure.mapBookData)

            ObjectPooler.ReleaseObject({obj: mapBookStructure.nameLabel, tag: mapBookStructure.nameLabel.tags.poolTag});
            ObjectPooler.ReleaseObject({obj: mapBookStructure.dateLabel, tag: mapBookStructure.dateLabel.tags.poolTag});

            mapBookStructure.mapBookData = null;
            mapBookStructure.nameLabel = null;
            mapBookStructure.dateLabel = null;
            const mapBookStructureIndex = thisBot.vars.mapBooksStructure.indexOf(mapBookStructure);
            if(mapBookStructureIndex >= 0) thisBot.vars.mapBooksStructure.splice(mapBookStructureIndex, 1);
        });
    mapData.childrenStructures.splice(0, mapData.childrenStructures.length);
    staticMapElementsKeys.forEach((key) => {
        const element = mapData.staticMapElements[key]
        const fixedElement = Array.isArray(element) ? element : [element]
        fixedElement.forEach((currElement) => {
            ObjectPooler.ReleaseObject({obj: currElement, tag: currElement.tags.poolTag});
        })
        mapData.staticMapElements[key] = null;
    })    
    mapData.staticMapElements = null;
    if(mapDataIndex >= 0) thisBot.vars.mapsData.splice(mapDataIndex, 1);
}