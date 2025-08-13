/**
    * Creates a new `TestamentData` instance, sets up its sections, and stores it into the list of testaments data.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {number} that.arrangementIndex - Index of the current arrangement.
    * @param {number} that.testamentIndex - Index of the current testament.
    * @param {BibleData} that.bibleData? - Is optional and is the BibleData instance to where the TestamentData will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the testament should be hidden.
    * 
    * @returns {TestamentData} testamentData - The newly created `TestamentData` object with its sections.
    * @throws {Error} - If section creation fails.
    * 
    * @example
    * const testamentData = await StacksManager.CreateTestament({
    *     arrangementIndex: someArrangementIndex, 
    *     testamentIndex: someTestamentIndex, 
    *     bibleData: someBibleData
    * });
*/

import {TestamentData} from "interactiveBible.managers.StacksManager.TestamentData"
import {ParentDataIds} from "interactiveBible.managers.StacksManager.ParentDataIds"

const {arrangementIndex, testamentIndex, bibleData, isHidden = false} = that;
const testamentInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex];
const creationInfo = {arrangementIndex, testamentIndex};
const parentDataIds = new ParentDataIds({bibleId: bibleData?.id});
const testamentData = new TestamentData({elementInfo: testamentInfo, id: uuid(), parentDataIds, isInsideBible: true, creationInfo});
for(const sectionIndex in testamentInfo.sections)
{
    const sectionData = await thisBot.CreateSection({arrangementIndex, testamentIndex, sectionIndex, isInsideBible: true, isInsideTestament: true, bibleData, testamentData, isHidden});
    testamentData.AddChild(sectionData);
}

thisBot.vars.testamentsData.push(testamentData);
return testamentData;