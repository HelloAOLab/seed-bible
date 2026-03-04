globalThis.BibleStackManager = null;

ObjectPooler.RemoveObjectPools({
    poolTags: [
        BibleVizUtils.Data.tags.ObjectPoolTags.SectionShadow,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackBook,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackSection,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackTestament,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleTransformer,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleShadow,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackChunkOfVerses,
        BibleVizUtils.Data.tags.ObjectPoolTags.StackVerse
    ]
})