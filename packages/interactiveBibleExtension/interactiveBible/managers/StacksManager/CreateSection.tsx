/**
    * Creates a `SectionData` or `SectionBookData` instance based on the number of books in the section, and sets up the corresponding books or chapters.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {number} that.arrangementIndex - Index of the current arrangement.
    * @param {number} that.testamentIndex - Index of the current testament.
    * @param {string} that.sectionIndex - Index of the section within the testament.
    * @param {boolean} that.isInsideBible - Flag indicating if the section is inside the Bible.
    * @param {boolean} that.isInsideTestament - Flag indicating if the section is inside the Testament.
    * @param {BibleData} that.bibleData? - Is optional and is the BibleData instance to where the SectionData or SectionBookData will be linked to.
    * @param {TestamentData} that.testamentData? - Is optional and is the TestamentData instance to where the SectionData or SectionBookData will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the section or section book should be hidden.
    * 
    * @returns {SectionData|SectionBookData} data - The newly created `SectionData` or `SectionBookData` object with its children (books or chapters).
    * @throws {Error} - If the creation of books or chapters fails.
    * 
    * @example
    * const sectionData = await thisBot.CreateSection({
    *     arrangementIndex: someArrengementIndex, 
    *     testamentIndex: someTestamentIndex, 
    *     sectionIndex: someSectionIndex, 
    *     isInsideBible: true, 
    *     isInsideTestament: true, 
    *     bibleData: someBibleData, 
    *     testamentData: someTestamentData, 
    *     isHidden: false
    * });*/

import {SectionData} from "interactiveBible.managers.StacksManager.SectionData"
import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"
import {ParentDataIds} from "interactiveBible.managers.StacksManager.ParentDataIds"

const {arrangementIndex, testamentIndex, sectionIndex, isInsideBible, isInsideTestament, bibleData, testamentData, isHidden = false} = that;
const sectionInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex];
const amountOfChaptersInSection = GetAmountOfChaptersInSection(sectionInfo.books);
let data;
const creationInfo = {arrangementIndex, testamentIndex, sectionIndex, amountOfChaptersInSection};

if(sectionInfo.books.length > 1)
{
    const parentDataIds = new ParentDataIds({bibleId: bibleData?.id, testamentId: testamentData?.id});
    data = new SectionData({
        elementInfo: sectionInfo, 
        id: uuid(), 
        parentDataIds, 
        sectionIndex, 
        isInsideBible, 
        isInsideTestament, 
        creationInfo
    });
    const levels = GetSectionLevels(sectionInfo.books);
    const levelsLenght = levels.length;
    for(const level of levels)
    {
        const booksData = [];
        const levelIndex = levels.indexOf(level);
        for(const bookInfo of level)
        {
            const bookIndex = sectionInfo.books.indexOf(bookInfo);
            const bookLevelIndex = level.indexOf(bookInfo);
            const bookData = await thisBot.CreateBook({
                arrangementIndex, 
                testamentIndex, 
                sectionIndex, 
                levelIndex, 
                bookIndex, 
                bookLevelIndex, 
                levelsLenght, 
                isInsideBible, 
                isInsideTestament, 
                isInsideSection: true,
                bibleData,
                testamentData,
                sectionData: data,
                isHidden
            });
            booksData.push(bookData);
        }
        data.AddChild(booksData);
    }
    thisBot.vars.sectionsData.push(data);
}
else
{
    const parentDataIds = new ParentDataIds({bibleId: bibleData?.id, testamentId: testamentData?.id});
    data = new SectionBookData({
        elementInfo: sectionInfo, 
        elementBookInfo: sectionInfo.books[0], 
        id: uuid(), 
        parentDataIds, 
        isInsideBible, 
        isInsideTestament,
        creationInfo
    });
    const chaptersData = await Promise.all(StacksManager.tags.booksStaticInfo[sectionInfo.books[0].commonName].chaptersInfo.map((chapterInfo) => {
        return thisBot.CreateChapter({
            chapterInfo, 
            isInsideBible: true, 
            isInsideBook: true, 
            bibleData, 
            testamentData, 
            sectionBookData: data, 
            isHidden
        })
    }))
    data.SetChildrenData(chaptersData);
    thisBot.vars.sectionBooksData.push(data);
}

return data;