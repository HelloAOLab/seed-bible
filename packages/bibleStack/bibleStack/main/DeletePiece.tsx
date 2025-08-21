/**
 * Deletes a Bible, Testament, Section, Book, or Chapter based on the provided `pieceData`.
 * It removes the piece from the data structures and releases associated resources.
 * 
 * @param {Object} that - Context containing the piece and its data.
 * @param {Object} that.pieceData - Data object representing the piece to delete.
 * @param {Object} that.piece - Piece associated with the data.
 * 
 * @returns {void}
 * @throws {Error} - If no piece data is found or deletion fails.
 * 
 * @example
 * thisBot.DeletePiece({pieceData: somePieceData, piece: somePiece});
 */

import { StackBibleData } from "BibleVizUtils.Classes.StackBibleData"
import { StackTestamentData } from "BibleVizUtils.Classes.StackTestamentData"
import { StackSectionData } from "BibleVizUtils.Classes.StackSectionData"
import { StackSectionBookData } from "BibleVizUtils.Classes.StackSectionBookData"
import { StackBookData } from "BibleVizUtils.Classes.StackBookData"
import { StackChapterData } from "BibleVizUtils.Classes.StackChapterData"
let { pieceData } = that;
const { piece } = that;
if (!pieceData) {
    if (piece.tags.isStackPiece) {
        pieceData = thisBot.GetPieceData({ piece });
    }
    else if (piece.tags.isBibleTransformer) {
        pieceData = thisBot.vars.stackBiblesData.find((bibleData) => { return bibleData.id == piece.tags.stackBibleId });
    }
    else if (piece.tags.isSectionShadow) {
        pieceData = thisBot.vars.stackSectionsData.find((data) => { return data.isActive && data.id == piece.tags.sectionDataId })
    }
}
// const {bibleData, testamentData, sectionData, sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: pieceData.parentDataIds});
if (pieceData) {
    switch (true) {
        case pieceData instanceof StackBibleData:
            DeleteBible(pieceData);
            break;
        case pieceData instanceof StackTestamentData:
            DeleteTestament(pieceData)
            break;
        case pieceData instanceof StackSectionData:
            DeleteSection(pieceData);
            break;
        case pieceData instanceof StackSectionBookData:
        case pieceData instanceof StackBookData:
            DeleteBook(pieceData)
            break;
        case pieceData instanceof StackChapterData:
            DeleteChapter(pieceData);
            break;
        default: break;
    }
}
else console.warn('interactiveBible.managers.thisBot.DeletePiece. No piece data found.')

function DeleteChapter(chapterData) {
    /**
     * Deletes a `StackChapterData` object and its associated verses.
     * 
     * @param {StackChapterData} chapterData - The StackChapterData object to delete.
     */

    const chapterDataIndex = thisBot.vars.stackChaptersData.indexOf(chapterData);
    if (chapterData.piece) {
        if (chapterData.piece.masks.isOnTheGround) {
            BibleVizUtils.Functions.ReleaseLabelTransformerFromPiece({piece: chapterData.piece})
            if (chapterData.isSelected && chapterData.piece.vars.chunksOfVerses?.length > 0) {
                chapterData.piece.vars.chunksOfVerses.forEach((chunk) => {
                    if (chunk.masks.isSelected && chunk.vars.verses?.length > 0) {
                        chunk.vars.verses.flat().forEach((verse) => { ObjectPooler.ReleaseObject({ obj: verse, tag: verse.tags.poolTag }) })
                        chunk.vars.verses = [] //.splice(0, chunk.vars.verses.length);
                    }
                    ObjectPooler.ReleaseObject({ obj: chunk, tag: chunk.tags.poolTag });
                })
                chapterData.piece.vars.chunksOfVerses = [] //.splice(0, chapterData.piece.vars.chunksOfVerses.length);
            }
        }
        ObjectPooler.ReleaseObject({ obj: chapterData.piece, tag: chapterData.piece.tags.poolTag });
        chapterData.piece = null;
    }
    chapterData.pieceInfo = null;
    chapterData.parentDataIds = null;
    if (chapterDataIndex != null) thisBot.vars.stackChaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(bookData) {
    /**
     * Deletes a `StackBookData` or `StackSectionBookData` object and its associated chapters.
     * 
     * @param {StackBookData|StackSectionBookData} bookData - The StackBookData object to delete.
     */

    let bookDataIndex;
    bookData.childrenData.forEach((chapterData) => { DeleteChapter(chapterData) });
    bookData.childrenData.splice(0, bookData.childrenData.length);
    if (bookData.piece) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ piece: bookData.piece });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBiblePieceHighlighted({ piece: bookData.piece })) thisBot.RemovePieceFromHighlightedList({ piece: bookData.piece });
        BibleVizUtils.Functions.ReleaseLabelTransformerFromPiece({piece: bookData.piece})
        ObjectPooler.ReleaseObject({ obj: bookData.piece, tag: bookData.piece.tags.poolTag });
        bookData.piece = null;
    }

    bookData.pieceInfo = null;
    bookData.parentDataIds = null;
    bookData.creationInfo = null;

    if (bookData instanceof StackBookData) {
        bookDataIndex = thisBot.vars.stackBooksData.indexOf(bookData);
        if (bookDataIndex != null) thisBot.vars.stackBooksData.splice(bookDataIndex, 1);
    }
    else {
        bookData.pieceBookInfo = null;
        bookDataIndex = thisBot.vars.stackSectionBooksData.indexOf(bookData);
        if (bookDataIndex != null) thisBot.vars.stackSectionBooksData.splice(bookDataIndex, 1);
    }
    if (thisBot.vars.lastInteractedStackBookData && thisBot.vars.lastInteractedStackBookData == bookData) thisBot.vars.lastInteractedStackBookData = null;
}

function DeleteSection(sectionData) {
    /**
     * Deletes a `StackSectionData` object and its associated books.
     * 
     * @param {StackSectionData} sectionData - The StackSectionData object to delete.
     */

    const sectionDataIndex = thisBot.vars.stackSectionsData.indexOf(sectionData);
    sectionData.childrenData.flat().forEach((bookData) => { DeleteBook(bookData) });
    sectionData.childrenData.splice(0, sectionData.childrenData.length);
    if (sectionData.piece) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ piece: sectionData.piece });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBiblePieceHighlighted({ piece: sectionData.piece })) thisBot.RemovePieceFromHighlightedList({ piece: sectionData.piece });
        BibleVizUtils.Functions.ReleaseLabelTransformerFromPiece({piece: sectionData.piece});
        ObjectPooler.ReleaseObject({ obj: sectionData.piece, tag: sectionData.piece.tags.poolTag });
        sectionData.piece = null;
    }
    if (sectionData.shadow) {
        BibleVizUtils.Functions.ReleaseLabelTransformerFromPiece({piece: sectionData.shadow});
        ObjectPooler.ReleaseObject({ obj: sectionData.shadow, tag: sectionData.shadow.tags.poolTag });
        sectionData.shadow = null;
    }

    sectionData.pieceInfo = null;
    sectionData.parentDataIds = null;
    sectionData.creationInfo = null;

    if (sectionDataIndex != null) thisBot.vars.stackSectionsData.splice(sectionDataIndex, 1);
    if (thisBot.vars.lastInteractedStackSectionData && thisBot.vars.lastInteractedStackSectionData == sectionData) thisBot.vars.lastInteractedStackSectionData = null;
}

function DeleteTestament(testamentData) {
    /**
     * Deletes a `StackTestamentData` object and its associated sections and books.
     * 
     * @param {StackTestamentData} testamentData - The StackTestamentData object to delete.
     */

    const testamentDataIndex = thisBot.vars.stackTestamentsData.indexOf(testamentData);
    testamentData.childrenData.forEach((data) => {
        if (data instanceof StackSectionData) DeleteSection(data);
        else if (data instanceof StackSectionBookData) DeleteBook(data);
    });

    testamentData.childrenData.splice(0, testamentData.childrenData.length);
    if (testamentData.piece) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ piece: testamentData.piece });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBiblePieceHighlighted({ piece: testamentData.piece })) thisBot.RemovePieceFromHighlightedList({ piece: testamentData.piece });
        BibleVizUtils.Functions.ReleaseLabelTransformerFromPiece({piece: testamentData.piece});
        ObjectPooler.ReleaseObject({ obj: testamentData.piece, tag: testamentData.piece.tags.poolTag });
        testamentData.piece = null;
    }

    testamentData.pieceInfo = null;
    testamentData.parentDataIds = null;
    testamentData.creationInfo = null;

    if (testamentDataIndex != null) thisBot.vars.stackTestamentsData.splice(testamentDataIndex, 1);
    if (thisBot.vars.lastInteractedStackTestamentData && thisBot.vars.lastInteractedStackTestamentData == testamentData) thisBot.vars.lastInteractedStackTestamentData = null;
}

function DeleteBible(bibleData) {
    /**
     * Deletes a `StackBibleData` object and its associated testaments, sections, and static pieces.
     * 
     * @param {StackBibleData} bibleData - The StackBibleData object to delete.
     */

    // shout('OnBibleDeleted');
    // if (globalThis?.SetCanvasTools) {
    //     SetCanvasTools(tools => {
    //         return tools.map(tool => {
    //             if (tool.label === "Bible stack") {
    //                 return {
    //                     ...tool,
    //                     active: true
    //                 }
    //             } else {
    //                 return tool
    //             }
    //         })
    //     })
    // }
    const bibleDataIndex = thisBot.vars.stackBiblesData.indexOf(bibleData);
    const staticBiblePiecesKeys = Object.keys(bibleData.staticBiblePieces)
    bibleData.childrenData.forEach((testamentData) => { DeleteTestament(testamentData); });
    bibleData.childrenData.splice(0, bibleData.childrenData.length);
    staticBiblePiecesKeys.forEach((key) => {
        ObjectPooler.ReleaseObject({ obj: bibleData.staticBiblePieces[key], tag: bibleData.staticBiblePieces[key].tags.poolTag });
        bibleData.staticBiblePieces[key] = null;
    })
    bibleData.staticBiblePieces = null;
    if (bibleDataIndex != null) thisBot.vars.stackBiblesData.splice(bibleDataIndex, 1);
    if (thisBot.vars.lastInteractedStackBibleData && thisBot.vars.lastInteractedStackBibleData == bibleData) thisBot.vars.lastInteractedStackBibleData = null;
}