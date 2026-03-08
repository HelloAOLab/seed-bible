import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

globalThis.BibleStackManager = null;

ObjectPooler.RemoveObjectPools({
  poolTags: [
    ObjectPoolTags.SectionShadow,
    ObjectPoolTags.StackChapter,
    ObjectPoolTags.StackBook,
    ObjectPoolTags.StackSection,
    ObjectPoolTags.StackTestament,
    ObjectPoolTags.StackBibleTransformer,
    ObjectPoolTags.StackCover,
    ObjectPoolTags.StackCrossLine,
    ObjectPoolTags.StackBibleShadow,
    ObjectPoolTags.StackChunkOfVerses,
    ObjectPoolTags.StackVerse,
  ],
});
