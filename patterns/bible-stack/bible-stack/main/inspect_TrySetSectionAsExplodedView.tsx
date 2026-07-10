/**
 * This tag takes a section an set it to exploded view and unset the previous exploded view if it exists
 * @param {Object} that - Object that contains important data for the function
 * @param {Bok} that.section - The section to modify
 * @example
 * shout("TrySetSectionAsExplodedView", {section: someSection});
 */
import { BibleVisualizationStates } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { seedBiblePresenceProvider } from "bibleVizUtils.services.index";

const {
  section,
  setBibleAnimating = true,
  speedMultiplier,
  isInstantaneous,
}: {
  section: Bot;
  setBibleAnimating?: boolean;
  speedMultiplier: number;
  isInstantaneous: boolean;
} = that;

if (thisBot.masks.isBibleAnimating && setBibleAnimating) return false;

const sectionData = await (thisBot.GetPieceData({
  piece: section,
}) as Promise<StackSectionData | undefined>);

if (!sectionData) {
  throw new Error("sectionData not found at TrySetSectionAsExplodedView");
}

const { bibleData, testamentData } =
  await (thisBot.GetDataChainFromParentDataIds({
    parentDataIds: sectionData.parentDataIds,
  }) as Promise<{
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
  }>);

if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);

if (
  testamentData ||
  (bibleData &&
    bibleData.currentStackVizState === BibleVisualizationStates.Regular)
) {
  const previousExplodedViewSectionData: StackSectionData | undefined =
    await thisBot.GetPreviousExplodedViewSectionData({
      bibleData,
      testamentData,
    });
  if (previousExplodedViewSectionData) {
    previousExplodedViewSectionData.implode();
  }
}
sectionData.explode();
thisBot.vars.lastInteractedStackSectionData = sectionData;
await thisBot.UpdateStacks({ speedMultiplier, isInstantaneous });

if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackPiecesActivityNotification();

const activeTab = seedBiblePresenceProvider.getActiveTab();

if (activeTab) {
  const activeBook = sectionData.childrenData.flat().find((bookData) => {
    return (
      bookData.getPieceInfoProperty("commonName") === activeTab.data.book &&
      bookData.isActivelySelected()
    );
  });

  if (activeBook)
    thisBot.UpdateStackTabsVisualization({
      source: "OnStackBookSelectionComplete",
    });
}
