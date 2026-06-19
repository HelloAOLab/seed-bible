/**
 * Take an instance of ParentDataIds and return the chain of parents data
 * @param {Object} that - Object that contains important data for the function
 * @param {ParentDataIds} that.parentDataIds - Object that contains the ids of the data of the parents of some piece
 * @example
 * const {bibleData, testamentData, sectionData, sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds});
 */

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { ParentDataIds } from "bibleVizUtils.models.canvas";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

const {
  parentDataIds,
}: {
  parentDataIds: ParentDataIds;
} = that;
let bibleData, testamentData, sectionData, sectionBookData, bookData;

if (parentDataIds.stackBibleId)
  bibleData = (thisBot.vars.stackBiblesData as StackBibleData[]).find(
    (data) => {
      return data.id === parentDataIds.stackBibleId;
    }
  );
if (parentDataIds.stackTestamentId)
  testamentData = (
    thisBot.vars.stackTestamentsData as StackTestamentData[]
  ).find((data) => {
    return data.id === parentDataIds.stackTestamentId;
  });
if (parentDataIds.stackSectionId)
  sectionData = (thisBot.vars.stackSectionsData as StackSectionData[]).find(
    (data) => {
      return data.id === parentDataIds.stackSectionId;
    }
  );
if (parentDataIds.stackSectionBookId)
  sectionBookData = (
    thisBot.vars.stackSectionBooksData as StackSectionBookData[]
  ).find((data) => {
    return data.id === parentDataIds.stackSectionBookId;
  });
if (parentDataIds.stackBookId)
  bookData = (thisBot.vars.stackBooksData as StackBookData[]).find((data) => {
    return data.id === parentDataIds.stackBookId;
  });

return { bibleData, testamentData, sectionData, sectionBookData, bookData };
