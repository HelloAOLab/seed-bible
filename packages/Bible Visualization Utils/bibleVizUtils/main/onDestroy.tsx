globalThis.BibleVizUtils = null;

globalThis.PieceInfo = null;
globalThis.StackBibleData = null;
globalThis.StackTestamentData = null;
globalThis.StackSectionData = null;
globalThis.StackSectionBookData = null;
globalThis.StackBookData = null;
globalThis.StackChapterData = null;
globalThis.LayoutChapterData = null;
globalThis.AnimateTagObject = null;
globalThis.HistoryTimePeriodInfo = null;
globalThis.LayoutBibleData = null;
globalThis.LayoutBookData = null;
globalThis.LayoutBookStructure = null;
globalThis.ParentDataIds = null;
globalThis.QueuedChapterData = null;
globalThis.StackData = null;
globalThis.TourGuideData = null;
globalThis.UnhighlightDelayInfo = null;

ObjectPooler.RemoveObjectPools({
  poolTags: [
    BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabel,
    BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTail,
    BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelDate,
    BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer,
    BibleVizUtils.Data.tags.ObjectPoolTags.UserColor,
    BibleVizUtils.Data.tags.ObjectPoolTags.ActivityNotification,
  ],
});

if (thisBot.masks.historyUpdateIntervalId) {
  clearInterval(thisBot.masks.historyUpdateIntervalId);
}
