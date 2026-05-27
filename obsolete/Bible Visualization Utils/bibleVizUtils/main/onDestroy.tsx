import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

globalThis.BibleVizUtils = null;

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
