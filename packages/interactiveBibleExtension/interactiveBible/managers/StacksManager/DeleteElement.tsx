/**
 * Deletes a Bible, Testament, Section, Book, or Chapter based on the provided `elementData`.
 * It removes the element from the data structures and releases associated resources.
 * 
 * @param {Object} that - Context containing the element and its data.
 * @param {Object} that.elementData - Data object representing the element to delete.
 * @param {Object} that.element - Element associated with the data.
 * 
 * @returns {void}
 * @throws {Error} - If no element data is found or deletion fails.
 * 
 * @example
 * StacksManager.DeleteElement({elementData: someElementData, element: someElement});
 */

import { BibleData } from "interactiveBible.managers.StacksManager.BibleData"
import { TestamentData } from "interactiveBible.managers.StacksManager.TestamentData"
import { SectionData } from "interactiveBible.managers.StacksManager.SectionData"
import { SectionBookData } from "interactiveBible.managers.StacksManager.SectionBookData"
import { BookData } from "interactiveBible.managers.StacksManager.BookData"
import { ChapterData } from "interactiveBible.managers.StacksManager.ChapterData"
let { elementData, element } = that;
if (!elementData) {
    if (element.tags.isBibleElement) {
        elementData = thisBot.GetBibleElementData({ element });
    }
    else if (element.tags.isBibleTransformer) {
        elementData = thisBot.vars.biblesData.find((bibleData) => { return bibleData.id == element.tags.bibleId });
    }
    else if (element.tags.isSectionShadow) {
        elementData = thisBot.vars.sectionsData.find((data) => { return data.isActive && data.id == element.tags.sectionDataId })
    }
}
// const {bibleData, testamentData, sectionData, sectionBookData, bookData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: elementData.parentDataIds});
if (elementData) {
    switch (true) {
        case elementData instanceof BibleData:
            DeleteBible(elementData);
            break;
        case elementData instanceof TestamentData:
            DeleteTestament(elementData)
            break;
        case elementData instanceof SectionData:
            DeleteSection(elementData);
            break;
        case elementData instanceof SectionBookData:
        case elementData instanceof BookData:
            DeleteBook(elementData)
            break;
        case elementData instanceof ChapterData:
            DeleteChapter(elementData);
            break;
        default: break;
    }
}
else console.warn('interactiveBible.managers.StacksManager.DeleteElement. No element data found.')

function DeleteChapter(chapterData) {
    /**
     * Deletes a `ChapterData` object and its associated verses.
     * 
     * @param {ChapterData} chapterData - The ChapterData object to delete.
     */

    const chapterDataIndex = thisBot.vars.chaptersData.indexOf(chapterData);
    if (chapterData.element) {
        if (chapterData.element.masks.isOnTheGround) {
            ReleaseLabelTransformerFromElement(chapterData.element)
            if (chapterData.isSelected && chapterData.element.vars.chunksOfVerses?.length > 0) {
                chapterData.element.vars.chunksOfVerses.forEach((chunk) => {
                    if (chunk.masks.isSelected && chunk.vars.verses?.length > 0) {
                        chunk.vars.verses.flat().forEach((verse) => { ObjectPooler.ReleaseObject({ obj: verse, tag: verse.tags.poolTag }) })
                        chunk.vars.verses = [] //.splice(0, chunk.vars.verses.length);
                    }
                    ObjectPooler.ReleaseObject({ obj: chunk, tag: chunk.tags.poolTag });
                })
                chapterData.element.vars.chunksOfVerses = [] //.splice(0, chapterData.element.vars.chunksOfVerses.length);
            }
        }
        ObjectPooler.ReleaseObject({ obj: chapterData.element, tag: chapterData.element.tags.poolTag });
        chapterData.element = null;
    }
    chapterData.elementInfo = null;
    chapterData.parentDataIds = null;
    if (chapterDataIndex != null) thisBot.vars.chaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(bookData) {
    /**
     * Deletes a `BookData` or `SectionBookData` object and its associated chapters.
     * 
     * @param {BookData|SectionBookData} bookData - The BookData object to delete.
     */

    let bookDataIndex;
    bookData.childrenData.forEach((chapterData) => { DeleteChapter(chapterData) });
    bookData.childrenData.splice(0, bookData.childrenData.length);
    if (bookData.element) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ element: bookData.element });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBibleElementHighlighted({ element: bookData.element })) thisBot.RemoveElementFromHighlightedList({ element: bookData.element });
        ReleaseLabelTransformerFromElement(bookData.element)
        ObjectPooler.ReleaseObject({ obj: bookData.element, tag: bookData.element.tags.poolTag });
        bookData.element = null;
    }

    bookData.elementInfo = null;
    bookData.parentDataIds = null;
    bookData.creationInfo = null;

    if (bookData instanceof BookData) {
        bookDataIndex = thisBot.vars.booksData.indexOf(bookData);
        if (bookDataIndex != null) thisBot.vars.booksData.splice(bookDataIndex, 1);
    }
    else {
        bookData.elementBookInfo = null;
        bookDataIndex = thisBot.vars.sectionBooksData.indexOf(bookData);
        if (bookDataIndex != null) thisBot.vars.sectionBooksData.splice(bookDataIndex, 1);
    }
    if (thisBot.vars.lastInteractedBookData && thisBot.vars.lastInteractedBookData == bookData) thisBot.vars.lastInteractedBookData = null;
}

function DeleteSection(sectionData) {
    /**
     * Deletes a `SectionData` object and its associated books.
     * 
     * @param {SectionData} sectionData - The SectionData object to delete.
     */

    const sectionDataIndex = thisBot.vars.sectionsData.indexOf(sectionData);
    sectionData.childrenData.flat().forEach((bookData) => { DeleteBook(bookData) });
    sectionData.childrenData.splice(0, sectionData.childrenData.length);
    if (sectionData.element) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ element: sectionData.element });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBibleElementHighlighted({ element: sectionData.element })) thisBot.RemoveElementFromHighlightedList({ element: sectionData.element });
        ReleaseLabelTransformerFromElement(sectionData.element);
        ObjectPooler.ReleaseObject({ obj: sectionData.element, tag: sectionData.element.tags.poolTag });
        sectionData.element = null;
    }
    if (sectionData.shadow) {
        ReleaseLabelTransformerFromElement(sectionData.shadow);
        ObjectPooler.ReleaseObject({ obj: sectionData.shadow, tag: sectionData.shadow.tags.poolTag });
        sectionData.shadow = null;
    }

    sectionData.elementInfo = null;
    sectionData.parentDataIds = null;
    sectionData.creationInfo = null;

    if (sectionDataIndex != null) thisBot.vars.sectionsData.splice(sectionDataIndex, 1);
    if (thisBot.vars.lastInteractedSectionData && thisBot.vars.lastInteractedSectionData == sectionData) thisBot.vars.lastInteractedSectionData = null;
}

function DeleteTestament(testamentData) {
    /**
     * Deletes a `TestamentData` object and its associated sections and books.
     * 
     * @param {TestamentData} testamentData - The TestamentData object to delete.
     */

    const testamentDataIndex = thisBot.vars.testamentsData.indexOf(testamentData);
    testamentData.childrenData.forEach((data) => {
        if (data instanceof SectionData) DeleteSection(data);
        else if (data instanceof SectionBookData) DeleteBook(data);
    });

    testamentData.childrenData.splice(0, testamentData.childrenData.length);
    if (testamentData.element) {
        const { unhighlightDelayInfo, unhighlightDelayInfoIndex } = thisBot.GetUnhighlightDelayInfo({ element: testamentData.element });
        if (unhighlightDelayInfo) thisBot.ClearUnhighlightDelay({ unhighlightDelayInfo, unhighlightDelayInfoIndex });
        if (thisBot.IsBibleElementHighlighted({ element: testamentData.element })) thisBot.RemoveElementFromHighlightedList({ element: testamentData.element });
        ReleaseLabelTransformerFromElement(testamentData.element);
        ObjectPooler.ReleaseObject({ obj: testamentData.element, tag: testamentData.element.tags.poolTag });
        testamentData.element = null;
    }

    testamentData.elementInfo = null;
    testamentData.parentDataIds = null;
    testamentData.creationInfo = null;

    if (testamentDataIndex != null) thisBot.vars.testamentsData.splice(testamentDataIndex, 1);
    if (thisBot.vars.lastInteractedTestamentData && thisBot.vars.lastInteractedTestamentData == testamentData) thisBot.vars.lastInteractedTestamentData = null;
}

function DeleteBible(bibleData) {
    /**
     * Deletes a `BibleData` object and its associated testaments, sections, and static elements.
     * 
     * @param {BibleData} bibleData - The BibleData object to delete.
     */

    // shout('OnBibleDeleted');
    if (globalThis?.SetCanvasTools) {
        SetCanvasTools(tools => {
            return tools.map(tool => {
                if (tool.label === "Bible stack") {
                    return {
                        ...tool,
                        active: true
                    }
                } else {
                    return tool
                }
            })
        })
    }
    const bibleDataIndex = thisBot.vars.biblesData.indexOf(bibleData);
    const staticBibleElementsKeys = Object.keys(bibleData.staticBibleElements)
    bibleData.childrenData.forEach((testamentData) => { DeleteTestament(testamentData); });
    bibleData.childrenData.splice(0, bibleData.childrenData.length);
    staticBibleElementsKeys.forEach((key) => {
        ObjectPooler.ReleaseObject({ obj: bibleData.staticBibleElements[key], tag: bibleData.staticBibleElements[key].tags.poolTag });
        bibleData.staticBibleElements[key] = null;
    })
    bibleData.staticBibleElements = null;
    if (bibleDataIndex != null) thisBot.vars.biblesData.splice(bibleDataIndex, 1);
    if (thisBot.vars.lastInteractedBibleData && thisBot.vars.lastInteractedBibleData == bibleData) thisBot.vars.lastInteractedBibleData = null;
}