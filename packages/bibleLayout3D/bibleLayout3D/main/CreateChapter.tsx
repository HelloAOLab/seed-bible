import {ParentDataIds} from "bibleVizUtils.classes.ParentDataIds"
import {LayoutChapterData} from "bibleLayout3D.main.LayoutChapterData"

const {chapterInfo, layoutData, layoutBookData} = that;
const parentDataIds = new ParentDataIds({
    layoutId: layoutData?.id, 
    layoutBookId: layoutBookData?.id
});
const chapterData = new LayoutChapterData({
    id: uuid(), 
    elementInfo: chapterInfo, 
    parentDataIds, 
    originalLayoutId: layoutData?.id
})
thisBot.vars.layoutChaptersData.push(chapterData);
return chapterData;