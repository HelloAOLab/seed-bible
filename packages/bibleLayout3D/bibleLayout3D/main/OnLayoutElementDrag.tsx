import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"
const {data} = that;
const {layoutData, layoutBookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});
let pulledOutFromParent = false

setTagMask(data.element, "isOnTheGround", false);
setTagMask(data.element, 'isBeingDragged', true);

switch(true)
{
    case data instanceof LayoutBookData:
        if(layoutData) pulledOutFromParent = true;
    break;
    case data instanceof LayoutChapterData:
        if(layoutData || layoutBookData) pulledOutFromParent = true;
    break;
    default: break;
}
if(pulledOutFromParent) thisBot.PullOutElementFromParent({elementData: data, layoutData, layoutBookData});