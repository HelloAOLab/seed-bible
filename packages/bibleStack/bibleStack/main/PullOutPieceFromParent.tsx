/**
 * Pulls out a given piece from its parent stack in the Bible arrangement and creates a copy of the piece.
 *
 * This function handles various piece types such as `StackTestamentData`, `StackSectionData`, `StackSectionBookData`, `StackBookData`, and `StackChapterData`.
 * It removes the piece from its parent data's children array, nullifies its parent IDs, creates a copy of the piece, and updates the stack structure accordingly.
 * It also handles clearing the highlight and selection states of the piece and its children.
 *
 * @param {Object} that - The context object containing the piece data and related stack information.
 * @param {StackPieceData} that.pieceData - The piece data being pulled out.
 * @param {StackBibleData} that.bibleData? - Is optional and is the Bible data structure the piece belongs to.
 * @param {StackTestamentData} that.testamentData? - Is optional and is the Testament data structure the piece belongs to.
 * @param {StackSectionData} that.sectionData? - Is optional and is the Section data structure the piece belongs to.
 * @param {StackSectionBookData} that.sectionBookData? - Is optional and is the SectionBook data structure the piece belongs to.
 * @param {StackBookData} that.bookData? - Is optional and is the Book data structure the piece belongs to.
 *
 * @returns {Promise<void>} - This function is asynchronous and returns a promise that resolves when the operation completes.
 * 
 * @example
 * thisBot.PullOutPieceFromParent({
 *   pieceData: somePieceData,
 *   bibleData: someBibleData,
 *   testamentData: someTestamentData,
 *   sectionData: someSectionData,
 *   sectionBookData: someSectionBookData,
 *   bookData: someBookData
 * });
 */

import {StackTestamentData} from "BibleVizUtils.Classes.StackTestamentData"
import {StackSectionData} from "BibleVizUtils.Classes.StackSectionData"
import {StackSectionBookData} from "BibleVizUtils.Classes.StackSectionBookData"
import {StackBookData} from "BibleVizUtils.Classes.StackBookData"
import {StackChapterData} from "BibleVizUtils.Classes.StackChapterData"
const {pieceData, bibleData, testamentData, sectionData, sectionBookData, bookData} = that;
const pieceDataCopy = await CreateDataCopy(pieceData);
let pieceDataIndex;

const nullifiableIds = {
    stackBibleId: 'stackBibleId',
    stackTestamentId: 'stackTestamentId',
    stackSectionId: 'stackSectionId',
    stackSectionBookId: 'stackSectionBookId',
    stackBookId: 'stackBookId'
}

pieceData.piece.tags.toErase = true;

switch(true)
{
    case pieceData instanceof StackTestamentData: {
        NullifyTestamentParentIds(pieceData, [nullifiableIds.stackBibleId]);
        pieceDataIndex = bibleData.childrenData.indexOf(pieceData);
        bibleData.childrenData.splice(pieceDataIndex, 1, pieceDataCopy);
    }
    break;
    case pieceData instanceof StackSectionData: {
        NullifySectionParentIds(pieceData, [nullifiableIds.stackBibleId, nullifiableIds.stackTestamentId])
        pieceDataIndex = testamentData.childrenData.indexOf(pieceData);
        testamentData.childrenData.splice(pieceDataIndex, 1, pieceDataCopy);
    }
    break;
    case pieceData instanceof StackSectionBookData: {
        NullifySectionBookParentIds(pieceData, [nullifiableIds.stackBibleId, nullifiableIds.stackTestamentId])
        pieceDataIndex = testamentData.childrenData.indexOf(pieceData);
        testamentData.childrenData.splice(pieceDataIndex, 1, pieceDataCopy);
    } 
    break;
    case pieceData instanceof StackBookData: {
        const bookDataArr = sectionData.childrenData.find((dataArr) => {return dataArr.includes(pieceData)});
        NullifyBookParentIds(pieceData, [nullifiableIds.stackBibleId, nullifiableIds.stackTestamentId, nullifiableIds.stackSectionId])
        pieceDataIndex = bookDataArr.indexOf(pieceData);
        bookDataArr.splice(pieceDataIndex, 1, pieceDataCopy);
    }
    break;
    case pieceData instanceof StackChapterData: {
        const actualParentData = sectionBookData ?? bookData;
        NullifyChapterParentIds(pieceData, [
            nullifiableIds.stackBibleId, 
            nullifiableIds.stackTestamentId, 
            nullifiableIds.stackSectionId, 
            nullifiableIds.stackSectionBookId, 
            nullifiableIds.stackBookId,
        ])
        pieceDataIndex = actualParentData.childrenData.indexOf(pieceData);
        actualParentData.childrenData.splice(pieceDataIndex, 1, pieceDataCopy);
        if(actualParentData.piece.vars.previousHighlightedChapterData === pieceData) actualParentData.piece.vars.previousHighlightedChapterData = null;
        if(actualParentData.currentSelectedChapterData == pieceData) actualParentData.currentSelectedChapterData = null;
    }
    break;
    default: break;
}

return Promise.all(shout('OnStackPiecePulledOut'));

function NullifyTestamentParentIds(testamentData, idsToNullify)
{
    NullifyParentIdsOnData(testamentData, idsToNullify);
    testamentData.childrenData.forEach((sectionData) => {
        if(sectionData instanceof StackSectionData) NullifySectionParentIds(sectionData, idsToNullify);
        else NullifySectionBookParentIds(sectionData, idsToNullify);
    })
}

function NullifySectionParentIds(sectionData, idsToNullify)
{
    NullifyParentIdsOnData(sectionData, idsToNullify);
    sectionData.childrenData.flat().forEach((bookData) => {NullifyBookParentIds(bookData, idsToNullify)})
}

function NullifySectionBookParentIds(sectionBookData, idsToNullify)
{
    NullifyParentIdsOnData(sectionBookData, idsToNullify);
    sectionBookData.childrenData.forEach((chapterData) => {NullifyChapterParentIds(chapterData, idsToNullify)})
}

function NullifyBookParentIds(bookData, idsToNullify)
{
    NullifyParentIdsOnData(bookData, idsToNullify);
    bookData.childrenData.forEach((chapterData) => {NullifyChapterParentIds(chapterData, idsToNullify)})
}

function NullifyChapterParentIds(chapterData, idsToNullify)
{
    NullifyParentIdsOnData(chapterData, idsToNullify);
}

function NullifyParentIdsOnData(data, idsToNullify)
{
    idsToNullify.forEach((idToNullify) => {data.parentDataIds[idToNullify] = null});
}

async function CreateDataCopy(data)
{
    let copy;
    switch(true)
    {
        case data instanceof StackTestamentData: {
            copy = await thisBot.CreateTestament({
                arrangementIndex: data.creationInfo.arrangementIndex, 
                testamentIndex: data.creationInfo.testamentIndex, 
                bibleData, 
                isHidden: true
            });
        }
        break;
        case data instanceof StackSectionData:
        case data instanceof StackSectionBookData:
        {
            copy = await thisBot.CreateSection({
                arrangementIndex: data.creationInfo.arrangementIndex, 
                testamentIndex: data.creationInfo.testamentIndex, 
                sectionIndex: data.creationInfo.sectionIndex, 
                isInsideBible: true, 
                isInsideTestament: true, 
                bibleData, 
                testamentData
            });
        }
        break;
        case data instanceof StackBookData: {
            copy = await thisBot.CreateBook({
                arrangementIndex: data.creationInfo.arrangementIndex, 
                testamentIndex: data.creationInfo.testamentIndex, 
                sectionIndex: data.creationInfo.sectionIndex,
                levelIndex: data.creationInfo.levelIndex, 
                bookIndex: data.creationInfo.bookIndex, 
                bookLevelIndex: data.creationInfo.bookLevelIndex,
                levelsLenght: data.creationInfo.levelsLenght, 
                isInsideBible: true, 
                isInsideTestament: true, 
                isInsideSection: true,
                bibleData,
                testamentData,
                sectionData,
            });
        }
        break;
        case data instanceof StackChapterData: {
            copy = await thisBot.CreateChapter({
                chapterInfo: data.pieceInfo,
                isInsideBible: true, 
                isInsideBook: true, 
                bibleData, 
                testamentData, 
                sectionData,
                sectionBookData,
                bookData, 
                isHidden: true
            })
        }
        break;
        default: break;
    }
    return copy;
}