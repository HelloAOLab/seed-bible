import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

globalThis.ScriptureMap3DManager = null;

ObjectPooler.RemoveObjectPools({
  poolTags: [
    ObjectPoolTags.LayoutCover,
    ObjectPoolTags.LayoutBook,
    ObjectPoolTags.LayoutBookNameLabel,
    ObjectPoolTags.LayoutBookDateLabel,
    ObjectPoolTags.LayoutLine,
    ObjectPoolTags.LayoutLabel,
    ObjectPoolTags.LayoutChapter,
    ObjectPoolTags.LayoutToggleButton,
    ObjectPoolTags.LayoutToggleBackground,
    ObjectPoolTags.LayoutToggleHandle,
    ObjectPoolTags.LayoutButton,
    ObjectPoolTags.LayoutButtonIcon,
    ObjectPoolTags.LayoutButtonLabel,
    ObjectPoolTags.LayoutColorPickerBackground,
    ObjectPoolTags.LayoutColorPickerContent,
    ObjectPoolTags.LayoutSettingsButton,
    ObjectPoolTags.LayoutBookInfoCardTransformer,
    ObjectPoolTags.LayoutBookInfoCardBackground,
    ObjectPoolTags.LayoutBookInfoCardContent,
    ObjectPoolTags.LayoutChapterPlaylistEntryItem,
    ObjectPoolTags.MapPlaylistNavigationButton,
    ObjectPoolTags.LayoutChapterPlaylistEntryNode,
    ObjectPoolTags.LayoutChunkOfVerses,
    ObjectPoolTags.LayoutVerse,
  ],
});
