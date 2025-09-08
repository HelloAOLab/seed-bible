import {HighlightInfo} from "managers.InstanceManager.HighlightInfo"

const {element, data} = that;

let prevColor;
let highlightSuccessful = false;
if(data)
{
    if(data.highlightColor != InstanceManager.tags.highlightColor)
    {
        if(!InstanceManager.masks.isInHistoryMode) setTagMask(data.element, "color", InstanceManager.tags.highlightColor);
        prevColor = data.highlightColor;
        data.highlightColor = InstanceManager.tags.highlightColor;
        highlightSuccessful = true;
    }
}
else
{
    let chapterData
    if(element.masks.chapterOrigin == "map")
    {
        chapterData = MapsManager.GetChapterDataById({id: element.masks.mapChapterDataId})
    }
    else if(element.masks.chapterOrigin == "stack")
    {
        chapterData = StacksManager.GetChapterDataById({id: element.masks.chapterDataId})
    }
    console.log({chapterData: {...chapterData}, element: {...element}})
    let currentHighlightInfo = chapterData.GetHighlightInfoByKey(element.masks.chunkPath ?? element.masks.versePath)

    if(currentHighlightInfo)
    {
        if(currentHighlightInfo.color != InstanceManager.tags.highlightColor)
        {
            if(!InstanceManager.masks.isInHistoryMode) setTagMask(element, "color", InstanceManager.tags.highlightColor);
            prevColor = currentHighlightInfo.color;
            currentHighlightInfo.color = InstanceManager.tags.highlightColor
            highlightSuccessful = true;
        }
    }
    else
    {
        if(!InstanceManager.masks.isInHistoryMode) setTagMask(element, "color", InstanceManager.tags.highlightColor);
        const newHighlightInfo = new HighlightInfo({
            color: InstanceManager.tags.highlightColor, 
            typeOfElement: element.tags.typeOfElement, 
            key: element.masks.chunkPath ?? element.masks.versePath
        })
        chapterData.AddHighlightInfo(newHighlightInfo)
        highlightSuccessful = true;
    }
}

if(highlightSuccessful) shout(`OnElementHighlighted`, {color: InstanceManager.tags.highlightColor, prevColor, element, data})