import type { BibleStackEvents } from "bibleStack.models.events";

export async function HandleCrossLinePointerDown({
  crossLine,
}: BibleStackEvents["OnCrossLinePointerDown"]) {
  const bibleData = await BibleStackManager.GetBibleDataById({
    stackBibleId: crossLine.tags.stackBibleId,
  });

  if (!bibleData) {
    throw new Error("HandleCrossLinePointerDown: bibleData not found.");
  }

  shout("TryToggleStackViz", { bibleData });
}

export async function HandleCrossLinePointerUp({
  crossLine,
}: BibleStackEvents["OnCrossLinePointerUp"]) {
  const bibleData = await BibleStackManager.GetBibleDataById({
    stackBibleId: crossLine.tags.stackBibleId,
  });

  if (!bibleData) {
    throw new Error("HandleCrossLinePointerUp: bibleData not found.");
  }

  shout("TryStopStackVizToggle", { bibleData });
}
