if (thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, "isBibleAnimating", true);

const { testamentName } = that;
const testamentData =
  thisBot.vars.lastInteractedStackBibleData?.childrenData.find(
    (currTestamentData: any) => {
      return currTestamentData.pieceInfo.name === testamentName;
    }
  );
if (
  thisBot.vars.lastInteractedStackBibleData &&
  testamentData &&
  testamentData.isActive &&
  !testamentData.isSplitIntoSections
) {
  await thisBot.PickTestament({
    bibleData: thisBot.vars.lastInteractedStackBibleData,
    testamentName,
  });
} else {
  await thisBot.SpawnBibleAndPickTestament({ testamentName });
}

setTagMask(thisBot, "isBibleAnimating", false);
return true;
