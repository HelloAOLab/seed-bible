import {LayoutBibleData} from "bibleVizUtils.classes.LayoutBibleData"
import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"
let {pieceData} = that;
const {piece} = that;
if(!pieceData)
{
    if(piece.tags.isLayoutCover)
    {
        pieceData = thisBot.vars.layoutsData.find((layoutData) => {return layoutData.id == piece.tags.layoutId});
    }
    else if(piece.tags.isLayoutPiece)
    {
        pieceData = thisBot.GetPieceData({piece});
    }
}
if(pieceData)
{
    switch(true)
    {
        case pieceData instanceof LayoutBibleData: 
            DeleteLayout(pieceData);
        break;
        case pieceData instanceof LayoutBookData: 
            DeleteBook(pieceData)
        break;
        case pieceData instanceof LayoutChapterData: 
            DeleteChapter(pieceData); 
        break;
        default: break;
    }
}
else console.warn('scriptureMap3D.main.DeletePiece. No piece data found.')

function DeleteChapter(chapterData)
{
    const chapterDataIndex = thisBot.vars.layoutChaptersData.indexOf(chapterData);
    if(chapterData.piece)
    {
        BibleVizUtils.Functions.TryHideActivityNotificationOnPiece({piece: chapterData.piece});
        if(chapterData.isSelected && Array.isArray(chapterData.piece.vars.chunksOfVerses) && chapterData.piece.vars.chunksOfVerses.length > 0)
        {
            chapterData.piece.vars.chunksOfVerses.forEach((chunk) => {
                if(chunk.masks.isSelected && Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                {
                    chunk.vars.verses.flat().forEach((verse) => {ObjectPooler.ReleaseObject({obj: verse, tag: verse.tags.poolTag})})
                    chunk.vars.verses.splice(0, chunk.vars.verses.length);
                }
                ObjectPooler.ReleaseObject({obj: chunk, tag: chunk.tags.poolTag});
            })
            chapterData.piece.vars.chunksOfVerses.splice(0, chapterData.piece.vars.chunksOfVerses.length);
        }
        ObjectPooler.ReleaseObject({obj: chapterData.piece, tag: chapterData.piece.tags.poolTag});
        chapterData.piece = null;
    }
    chapterData.pieceInfo = null;
    chapterData.parentDataIds = null;
    chapterData.ResetData();
    if(chapterDataIndex >= 0) thisBot.vars.layoutChaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(layoutBookData)
{
    const bookDataIndex = thisBot.vars.layoutBooksData.indexOf(layoutBookData);
    layoutBookData.childrenData.forEach((chapterData) => {DeleteChapter(chapterData)});
    layoutBookData.childrenData.splice(0, layoutBookData.childrenData.length);
    if(layoutBookData.piece)
    {
       
        ObjectPooler.ReleaseObject({obj: layoutBookData.piece, tag: layoutBookData.piece.tags.poolTag});
        layoutBookData.piece = null;
    }
    
    layoutBookData.pieceInfo = null;
    layoutBookData.parentDataIds = null;
    layoutBookData.creationInfo = null;

    if(bookDataIndex >= 0) thisBot.vars.layoutBooksData.splice(bookDataIndex, 1);
}

function DeleteLayout(layoutData)
{
    const layoutDataIndex = thisBot.vars.layoutsData.indexOf(layoutData);
    const staticLayoutPiecesKeys = Object.keys(layoutData.staticLayoutPieces)
    layoutData.childrenStructures
        .forEach((layoutBookStructure) => {
            DeleteBook(layoutBookStructure.layoutBookData)

            ObjectPooler.ReleaseObject({obj: layoutBookStructure.nameLabel, tag: layoutBookStructure.nameLabel.tags.poolTag});
            ObjectPooler.ReleaseObject({obj: layoutBookStructure.dateLabel, tag: layoutBookStructure.dateLabel.tags.poolTag});

            layoutBookStructure.layoutBookData = null;
            layoutBookStructure.nameLabel = null;
            layoutBookStructure.dateLabel = null;
            const bookStructureIndex = thisBot.vars.layoutBooksStructure.indexOf(layoutBookStructure);
            if(bookStructureIndex >= 0) thisBot.vars.layoutBooksStructure.splice(bookStructureIndex, 1);
        });
    layoutData.childrenStructures.splice(0, layoutData.childrenStructures.length);
    staticLayoutPiecesKeys.forEach((key) => {
        const piece = layoutData.staticLayoutPieces[key]
        const fixedPiece = Array.isArray(piece) ? piece : [piece]
        fixedPiece.forEach((currPiece) => {
            ObjectPooler.ReleaseObject({obj: currPiece, tag: currPiece.tags.poolTag});
        })
        layoutData.staticLayoutPieces[key] = null;
    })    
    layoutData.staticLayoutPieces = null;
    if(layoutDataIndex >= 0) thisBot.vars.layoutsData.splice(layoutDataIndex, 1);
}