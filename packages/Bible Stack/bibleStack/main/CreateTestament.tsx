import { arrangementService } from "bibleVizUtils.services.index";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackSectionData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackSectionData";

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

const {
  arrangementIndex,
  testamentIndex,
  bibleDataId,
  isHidden = false,
}: {
  arrangementIndex: number;
  testamentIndex: number;
  bibleData: StackBibleData;
  bibleDataId?: string;
  isHidden?: boolean;
} = that;
const testamentInfo = arrangementService.getTestamentByIndices({
  arrangementIndex,
  testamentIndex,
});

if (!testamentInfo) {
  console.error(`testamentInfo not found at CreateTestament`);
  return;
}

const creationParams = { arrangementIndex, testamentIndex };
const parentDataIds = { stackBibleId: bibleDataId };
const testamentDataId = uuid();
const sectionsData: StackSectionData[] = [];
for (const sectionIndex in testamentInfo.sections) {
  const sectionData = await thisBot.CreateSection({
    arrangementIndex,
    testamentIndex,
    sectionIndex,
    isInsideBible: true,
    isInsideTestament: true,
    bibleDataId,
    testamentDataId,
    isHidden,
  });
  sectionsData.push(sectionData);
}
const testamentData = new StackTestamentData({
  pieceInfo: testamentInfo,
  id: testamentDataId,
  parentDataIds,
  isInsideBible: true,
  creationParams,
  childrenData: sectionsData,
});

thisBot.vars.stackTestamentsData.push(testamentData);
return testamentData;
