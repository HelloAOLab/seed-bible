console.warn(
  "HighlightBiblePiece needs to be correctly implemented/refactored"
);
return;

// import type { HighlightData } from "bibleVizUtils.models.highlight.models";

// const {piece, data} = that;

// let prevColor;
// let highlightSuccessful = false;
// if(data)
// {
//     if(data.highlightColor != BibleVizUtils.Data.tags.highlightColor)
//     {
//         if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(data.piece, "color", BibleVizUtils.Data.tags.highlightColor);
//         prevColor = data.highlightColor;
//         data.highlightColor = BibleVizUtils.Data.tags.highlightColor;
//         highlightSuccessful = true;
//     }
// }
// else
// {
//     let chapterData
//     if(piece.masks.chapterOrigin == "layout")
//     {
//         chapterData = scriptureMap3DManagerManager.GetChapterDataById({id: piece.masks.layoutChapterDataId})
//     }
//     else if(piece.masks.chapterOrigin == "stack")
//     {
//         chapterData = BibleStackManager.GetChapterDataById({id: piece.masks.stackChapterDataId})
//     }
//     console.log({chapterData: {...chapterData}, piece: {...piece}})
//     const currentHighlightInfo = chapterData.GetHighlightInfoByKey(piece.masks.chunkPath ?? piece.masks.versePath)

//     if(currentHighlightInfo)
//     {
//         if(currentHighlightInfo.color != BibleVizUtils.Data.tags.highlightColor)
//         {
//             if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(piece, "color", BibleVizUtils.Data.tags.highlightColor);
//             prevColor = currentHighlightInfo.color;
//             currentHighlightInfo.color = BibleVizUtils.Data.tags.highlightColor
//             highlightSuccessful = true;
//         }
//     }
//     else
//     {
//         if(!BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(piece, "color", BibleVizUtils.Data.tags.highlightColor);
//         const newHighlightInfo: HighlightData = {
//             color: BibleVizUtils.Data.tags.highlightColor,
//             typeOfPiece: piece.tags.typeOfPiece,
//             key: piece.masks.chunkPath ?? piece.masks.versePath
//         }
//         chapterData.AddHighlightInfo(newHighlightInfo)
//         highlightSuccessful = true;
//     }
// }

// if(highlightSuccessful) shout(`OnElementHighlighted`, {color: BibleVizUtils.Data.tags.highlightColor, prevColor, piece, data})
