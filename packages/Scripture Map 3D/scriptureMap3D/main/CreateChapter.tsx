import {ParentDataIds} from "bibleVizUtils.classes.ParentDataIds"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"

const {chapterInfo, layoutData, layoutBookData} = that;
const parentDataIds = new ParentDataIds({
    layoutId: layoutData?.id, 
    layoutBookId: layoutBookData?.id
});
const chapterData = new LayoutChapterData({
    id: uuid(), 
    pieceInfo: chapterInfo, 
    parentDataIds, 
    originalLayoutId: layoutData?.id
})
thisBot.vars.layoutChaptersData.push(chapterData);
return chapterData;