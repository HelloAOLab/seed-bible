/**
    * Creates a new `StackTestamentData` instance, sets up its sections, and stores it into the list of testaments data.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {number} that.arrangementIndex - Index of the current arrangement.
    * @param {number} that.testamentIndex - Index of the current testament.
    * @param {StackBibleData} that.bibleData? - Is optional and is the StackBibleData instance to where the StackTestamentData will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the testament should be hidden.
    * 
    * @returns {StackTestamentData} testamentData - The newly created `StackTestamentData` object with its sections.
    * @throws {Error} - If section creation fails.
    * 
    * @example
    * const testamentData = await thisBot.CreateTestament({
    *     arrangementIndex: someArrangementIndex, 
    *     testamentIndex: someTestamentIndex, 
    *     bibleData: someBibleData
    * });
*/

import {StackTestamentData} from "bibleVizUtils.classes.StackTestamentData"
import {ParentDataIds} from "bibleVizUtils.classes.ParentDataIds"

const {arrangementIndex, testamentIndex, bibleData, isHidden = false} = that;
const testamentInfo = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex];
const creationInfo = {arrangementIndex, testamentIndex};
const parentDataIds = new ParentDataIds({stackBibleId: bibleData?.id});
const testamentData = new StackTestamentData({pieceInfo: testamentInfo, id: uuid(), parentDataIds, isInsideBible: true, creationInfo});
for(const sectionIndex in testamentInfo.sections)
{
    const sectionData = await thisBot.CreateSection({arrangementIndex, testamentIndex, sectionIndex, isInsideBible: true, isInsideTestament: true, bibleData, testamentData, isHidden});
    testamentData.AddChild(sectionData);
}

thisBot.vars.stackTestamentsData.push(testamentData);
return testamentData;