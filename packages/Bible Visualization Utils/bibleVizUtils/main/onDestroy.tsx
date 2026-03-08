import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

globalThis.BibleVizUtils = null;

globalThis.StackBibleData = null;
globalThis.StackTestamentData = null;
globalThis.StackSectionData = null;
globalThis.StackSectionBookData = null;
globalThis.StackBookData = null;
globalThis.StackChapterData = null;
globalThis.LayoutChapterData = null;
globalThis.LayoutBibleData = null;
globalThis.LayoutBookData = null;
globalThis.LayoutBookStructure = null;
globalThis.ParentDataIds = null;
globalThis.QueuedChapterData = null;
globalThis.TourGuideData = null;
globalThis.UnhighlightDelayInfo = null;

ObjectPooler.RemoveObjectPools({
  poolTags: [
    ObjectPoolTags.InfoLabel,
    ObjectPoolTags.InfoLabelTail,
    ObjectPoolTags.InfoLabelDate,
    ObjectPoolTags.InfoLabelTransformer,
    ObjectPoolTags.ActivityIndicator,
    ObjectPoolTags.ActivityNotification,
  ],
});

if (thisBot.masks.historyUpdateIntervalId) {
  clearInterval(thisBot.masks.historyUpdateIntervalId);
}
