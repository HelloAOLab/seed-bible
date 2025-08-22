globalThis.BibleStackManager = null;

ObjectPooler.RemoveObjectPools({
    poolTags: [
        BibleVizUtils.Data.tags.ObjectPoolTags.SectionShadow,
        BibleVizUtils.Data.tags.ObjectPoolTags.Chapter,
        BibleVizUtils.Data.tags.ObjectPoolTags.Book,
        BibleVizUtils.Data.tags.ObjectPoolTags.Section,
        BibleVizUtils.Data.tags.ObjectPoolTags.Testament,
        BibleVizUtils.Data.tags.ObjectPoolTags.BibleTransformer,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleShadow,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackChunkOfVerses,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackVerse
    ]
})