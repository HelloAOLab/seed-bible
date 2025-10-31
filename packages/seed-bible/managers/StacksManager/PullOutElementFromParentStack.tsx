/**
 * Pulls out a given element from its parent stack in the Bible arrangement and creates a copy of the element.
 *
 * This function handles various element types such as `TestamentData`, `SectionData`, `SectionBookData`, `BookData`, and `ChapterData`.
 * It removes the element from its parent data's children array, nullifies its parent IDs, creates a copy of the element, and updates the stack structure accordingly.
 * It also handles clearing the highlight and selection states of the element and its children.
 *
 * @param {Object} that - The context object containing the element data and related stack information.
 * @param {StackElementData} that.elementData - The element data being pulled out.
 * @param {BibleData} that.bibleData? - Is optional and is the Bible data structure the element belongs to.
 * @param {TestamentData} that.testamentData? - Is optional and is the Testament data structure the element belongs to.
 * @param {SectionData} that.sectionData? - Is optional and is the Section data structure the element belongs to.
 * @param {SectionBookData} that.sectionBookData? - Is optional and is the SectionBook data structure the element belongs to.
 * @param {BookData} that.bookData? - Is optional and is the Book data structure the element belongs to.
 *
 * @returns {Promise<void>} - This function is asynchronous and returns a promise that resolves when the operation completes.
 * 
 * @example
 * StacksManager.PullOutElementFromParentStack({
 *   elementData: someElementData,
 *   bibleData: someBibleData,
 *   testamentData: someTestamentData,
 *   sectionData: someSectionData,
 *   sectionBookData: someSectionBookData,
 *   bookData: someBookData
 * });
 */

import {TestamentData} from "managers.StacksManager.TestamentData"
import {SectionData} from "managers.StacksManager.SectionData"
import {SectionBookData} from "managers.StacksManager.SectionBookData"
import {BookData} from "managers.StacksManager.BookData"
import {ChapterData} from "managers.StacksManager.ChapterData"
const {elementData, bibleData, testamentData, sectionData, sectionBookData, bookData} = that;
const elementDataCopy = await CreateDataCopy(elementData);
let elementDataIndex;

const nullifiableIds = {
    bibleId: 'bibleId',
    testamentId: 'testamentId',
    sectionId: 'sectionId',
    sectionBookId: 'sectionBookId',
    bookId: 'bookId'
}

elementData.element.tags.toErase = true;

switch(true)
{
    case elementData instanceof TestamentData: {
        NullifyTestamentParentIds(elementData, [nullifiableIds.bibleId]);
        elementDataIndex = bibleData.childrenData.indexOf(elementData);
        bibleData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    case elementData instanceof SectionData: {
        NullifySectionParentIds(elementData, [nullifiableIds.bibleId, nullifiableIds.testamentId])
        elementDataIndex = testamentData.childrenData.indexOf(elementData);
        testamentData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    case elementData instanceof SectionBookData: {
        NullifySectionBookParentIds(elementData, [nullifiableIds.bibleId, nullifiableIds.testamentId])
        elementDataIndex = testamentData.childrenData.indexOf(elementData);
        testamentData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
    } 
    break;
    case elementData instanceof BookData: {
        const bookDataArr = sectionData.childrenData.find((dataArr) => {return dataArr.includes(elementData)});
        NullifyBookParentIds(elementData, [nullifiableIds.bibleId, nullifiableIds.testamentId, nullifiableIds.sectionId])
        elementDataIndex = bookDataArr.indexOf(elementData);
        bookDataArr.splice(elementDataIndex, 1, elementDataCopy);
    }
    break;
    case elementData instanceof ChapterData: {
        const actualParentData = sectionBookData ?? bookData;
        NullifyChapterParentIds(elementData, [
            nullifiableIds.bibleId, 
            nullifiableIds.testamentId, 
            nullifiableIds.sectionId, 
            nullifiableIds.sectionBookId, 
            nullifiableIds.bookId,
        ])
        elementDataIndex = actualParentData.childrenData.indexOf(elementData);
        actualParentData.childrenData.splice(elementDataIndex, 1, elementDataCopy);
        if(actualParentData.element.vars.previousHighlightedChapterData === elementData) actualParentData.element.vars.previousHighlightedChapterData = null;
        if(actualParentData.currentSelectedChapterData == elementData) actualParentData.currentSelectedChapterData = null;
    }
    break;
    default: break;
}

return Promise.all(shout('OnStackElementPulledOut'));

function NullifyTestamentParentIds(testamentData, idsToNullify)
{
    NullifyParentIdsOnData(testamentData, idsToNullify);
    testamentData.childrenData.forEach((sectionData) => {
        if(sectionData instanceof SectionData) NullifySectionParentIds(sectionData, idsToNullify);
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
        case data instanceof TestamentData: {
            copy = await thisBot.CreateTestament({
                arrangementIndex: data.creationInfo.arrangementIndex, 
                testamentIndex: data.creationInfo.testamentIndex, 
                bibleData, 
                isHidden: true
            });
        }
        break;
        case data instanceof SectionData:
        case data instanceof SectionBookData:
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
        case data instanceof BookData: {
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
        case data instanceof ChapterData: {
            copy = await thisBot.CreateChapter({
                chapterInfo: data.elementInfo,
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