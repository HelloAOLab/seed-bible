import {HighlightInfo} from "bibleVizUtils.classes.HighlightInfo"

const {element, data} = that;

let prevColor;
let highlightSuccessful = false;
if(data)
{
    if(data.highlightColor != BibleVizUtils.Data.tags.highlightColor)
    {
        if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(data.element, "color", BibleVizUtils.Data.tags.highlightColor);
        prevColor = data.highlightColor;
        data.highlightColor = BibleVizUtils.Data.tags.highlightColor;
        highlightSuccessful = true;
    }
}
else
{
    let chapterData
    if(element.masks.chapterOrigin == "layout")
    {
        chapterData = BibleLayout3DManager.GetChapterDataById({id: element.masks.layoutChapterDataId})
    }
    else if(element.masks.chapterOrigin == "stack")
    {
        chapterData = BibleStackManager.GetChapterDataById({id: element.masks.stackChapterDataId})
    }
    console.log({chapterData: {...chapterData}, element: {...element}})
    const currentHighlightInfo = chapterData.GetHighlightInfoByKey(element.masks.chunkPath ?? element.masks.versePath)

    if(currentHighlightInfo)
    {
        if(currentHighlightInfo.color != BibleVizUtils.Data.tags.highlightColor)
        {
            if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(element, "color", BibleVizUtils.Data.tags.highlightColor);
            prevColor = currentHighlightInfo.color;
            currentHighlightInfo.color = BibleVizUtils.Data.tags.highlightColor
            highlightSuccessful = true;
        }
    }
    else
    {
        if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(element, "color", BibleVizUtils.Data.tags.highlightColor);
        const newHighlightInfo = new HighlightInfo({
            color: BibleVizUtils.Data.tags.highlightColor, 
            typeOfElement: element.tags.typeOfElement, 
            key: element.masks.chunkPath ?? element.masks.versePath
        })
        chapterData.AddHighlightInfo(newHighlightInfo)
        highlightSuccessful = true;
    }
}

if(highlightSuccessful) shout(`OnElementHighlighted`, {color: BibleVizUtils.Data.tags.highlightColor, prevColor, element, data})