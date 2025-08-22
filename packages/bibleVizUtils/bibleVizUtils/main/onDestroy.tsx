globalThis.BibleVizUtils = null;

ObjectPooler.RemoveObjectPools({
    poolTags: [
        BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabel,
        BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTail,
        BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelDate,
        BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer,
        BibleVizUtils.Data.tags.ObjectPoolTags.UserColor,
        BibleVizUtils.Data.tags.ObjectPoolTags.UsersNotification
    ]
})