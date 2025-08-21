import {StackTestamentData} from "BibleVizUtils.Classes.StackTestamentData"
import {StackSectionData} from "BibleVizUtils.Classes.StackSectionData"
import {StackSectionBookData} from "BibleVizUtils.Classes.StackSectionBookData"
import {StackBookData} from "BibleVizUtils.Classes.StackBookData"
import {StackChapterData} from "BibleVizUtils.Classes.StackChapterData"

const piecesData = [
    ...thisBot.vars.stackTestamentsData, 
    ...thisBot.vars.stackSectionsData, 
    ...thisBot.vars.stackSectionBooksData, 
    ...thisBot.vars.stackBooksData,
    ...thisBot.vars.stackChaptersData
]

piecesData.forEach((pieceData) => {
    const isPieceAvailable = pieceData.piece && ((pieceData instanceof StackTestamentData) ? !pieceData.isSplitIntoSections :
        (pieceData instanceof StackSectionData) ? !pieceData.isSplitIntoBooks :
            ((pieceData instanceof StackSectionBookData) || (pieceData instanceof StackBookData)) ? !pieceData.isSelected : true)
    if(isPieceAvailable)
    {
        if(pieceData instanceof StackChapterData)
        {
            if(pieceData.isSelected)
            {
                if(pieceData.piece.masks.isOnTheGround) setTagMask(pieceData.piece, "color", pieceData.highlightColor ?? pieceData.piece.tags.initialColor);
                else setTagMask(pieceData.piece, "color", pieceData.highlightColor ?? pieceData.piece.tags.selectedColor);
                if(Array.isArray(pieceData.piece.vars.chunksOfVerses) && pieceData.piece.vars.chunksOfVerses.length > 0)
                {
                    pieceData.piece.vars.chunksOfVerses.forEach((chunk) => {
                        if(chunk.masks.isSelected)
                        {
                            if(Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                            {
                                chunk.vars.verses.forEach((verse) => {
                                    const chapterData = thisBot.GetChapterDataById({id: verse.masks.chapterDataId});
                                    const verseHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == verse.masks.versePath})
                                    setTagMask(verse, 'color', (verseHighlightInfo ? verseHighlightInfo.color : verse.tags.initialColor))
                                })
                            }
                        }
                        else
                        {
                            const chapterData = thisBot.GetChapterDataById({id: chunk.masks.chapterDataId});
                            const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == chunk.masks.chunkPath})
                            setTagMask(chunk, "color", (chunkHighlightInfo ? chunkHighlightInfo.color : chunk.tags.initialColor));
                        }
                    })
                }
            }
            else
            {
                setTagMask(pieceData.piece, "color", pieceData.highlightColor ?? pieceData.piece.tags.initialColor);
            }
        }
        else
        {
            setTagMask(pieceData.piece, "color", (pieceData.highlightColor ?? pieceData.piece.tags.initialColor));
        }
    }
})