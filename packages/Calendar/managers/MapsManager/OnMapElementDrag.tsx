import {MapBookData} from "managers.MapsManager.MapBookData"
import {MapChapterData} from "managers.MapsManager.MapChapterData"
const {data} = that;
const {mapData, mapBookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});
let pulledOutFromParent = false

setTagMask(data.element, "isOnTheGround", false);
setTagMask(data.element, 'isBeingDragged', true);

switch(true)
{
    case data instanceof MapBookData:
        if(mapData) pulledOutFromParent = true;
    break;
    case data instanceof MapChapterData:
        if(mapData || mapBookData) pulledOutFromParent = true;
    break;
    default: break;
}
if(pulledOutFromParent) thisBot.PullOutElementFromParent({elementData: data, mapData, mapBookData});