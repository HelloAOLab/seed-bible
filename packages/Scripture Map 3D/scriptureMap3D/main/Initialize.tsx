return;

if(thisBot.masks.initialized || configBot.tags.systemPortal) return;

setTagMask(thisBot, "initialized", true);
if(typeof scriptureMap3DManager === "undefined")
{
    globalThis.scriptureMap3DManager = thisBot;
}

thisBot.vars.arrangementIndex = 0;
thisBot.vars.layoutsData = [];
thisBot.vars.layoutBooksStructure = [];
thisBot.vars.layoutBooksData = [];
thisBot.vars.layoutChaptersData = [];
setTagMask(thisBot, "isAnimatingBible", false);

const coverPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutCover,
    bot: getBot(byTag("isBaseLayoutCover", true)),
    customTags: [
        new CustomTag({name: "isBaseLayoutCover", value: false}),
        new CustomTag({name: "isLayoutCover", value: true}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutCover}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const bookPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook,
    bot: getBot("system", "scriptureMap3D.prefabs.book"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook}),
        new CustomTag({name: "typeOfPiece", value: BibleVizUtils.Data.tags.BiblePieceType.LayoutBook}),
        new CustomTag({name: "isBaseLayoutBook", value: false}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const bookNameLabelsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookNameLabel,
    bot: getBot("system", "scriptureMap3D.prefabs.label"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookNameLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const bookDateLabelsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookDateLabel,
    bot: getBot("system", "scriptureMap3D.prefabs.bookDateLabel"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookDateLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 70
})
const linesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLine,
    bot: getBot("system", "scriptureMap3D.prefabs.line"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLine}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 17
})
const labelsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLabel,
    bot: getBot("system", "scriptureMap3D.prefabs.label"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLabel}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 6
})
const chaptersPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter,
    bot: getBot("system", "scriptureMap3D.prefabs.layoutChapter"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter}),
        new CustomTag({name: "typeOfPiece", value: BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter}),
        new CustomTag({name: "isBaseLayoutChapter", value: false}),
        new CustomTag({name: "system", value: null})
    ],
    size: 6
})
const toggleButtonsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton,
    bot: getBot("system", "scriptureMap3D.prefabs.toggle"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const toggleBackgroundsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground,
    bot: getBot("system", "scriptureMap3D.prefabs.toggleBackground"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const toggleHandlesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle,
    bot: getBot("system", "scriptureMap3D.prefabs.toggleHandle"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle}),
        new CustomTag({name: "system", value: null})
    ],
    size: 3
})
const buttonsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton,
    bot: getBot("system", "scriptureMap3D.prefabs.button"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 2
})
const buttonIconsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon,
    bot: getBot("system", "scriptureMap3D.prefabs.buttonIcon"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const buttonLabelsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel,
    bot: getBot("system", "scriptureMap3D.prefabs.buttonLabel"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const colorPickerBackgroundsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerBackground,
    bot: getBot("system", "scriptureMap3D.prefabs.colorPickerBackground"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerBackground}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const colorPickerContentsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerContent,
    bot: getBot("system", "scriptureMap3D.prefabs.colorPickerContent"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerContent}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const settingsButtonsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutSettingsButton,
    bot: getBot("system", "scriptureMap3D.prefabs.settingsButton"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutSettingsButton}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const bookInfoCardTransformer = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardTransformer,
    bot: getBot("system", "scriptureMap3D.prefabs.bookInfoCardTransformer"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardTransformer}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const bookInfoCardBackground = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardBackground,
    bot: getBot("system", "scriptureMap3D.prefabs.bookInfoCardBackground"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardBackground}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const bookInfoCardContent = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardContent,
    bot: getBot("system", "scriptureMap3D.prefabs.bookInfoCardContent"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardContent}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const chapterPlaylistEntryItemPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryItem,
    bot: getBot("system", "scriptureMap3D.prefabs.chapterPlaylistEntryItem"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryItem}),
        new CustomTag({name: "system", value: null})
    ],
    size: 1
})
const playlistNavigationButton = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton,
    bot: getBot("system", "scriptureMap3D.prefabs.playlistNavigationButton"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.MapPlaylistNavigationButton}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})
const chapterPlaylistEntryNodePool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryNode,
    bot: getBot("system", "scriptureMap3D.prefabs.chapterPlaylistEntryItemNode"),
    customTags: [
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapterPlaylistEntryNode}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const chunkOfVersesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChunkOfVerses,
    bot: getBot(byTag("isBaseLayoutChunkOfVerses", true)),
    customTags: [
        new CustomTag({name: "isBaseLayoutChunkOfVerses", value: false}),
        new CustomTag({name: "typeOfPiece", value: BibleVizUtils.Data.tags.BiblePieceType.LayoutChunkOfVerses}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChunkOfVerses}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const versesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutVerse,
    bot: getBot(byTag("isBaseLayoutVerse", true)),
    customTags: [
        new CustomTag({name: "isBaseLayoutVerse", value: false}),
        new CustomTag({name: "typeOfPiece", value: BibleVizUtils.Data.tags.BiblePieceType.LayoutVerse}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutVerse}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})

ObjectPooler.AddObjectPools({
    poolsData: [
        coverPool,
        bookPool,
        bookNameLabelsPool,
        bookDateLabelsPool,
        linesPool,
        labelsPool,
        chaptersPool,
        toggleButtonsPool,
        toggleBackgroundsPool,
        toggleHandlesPool,
        buttonsPool,
        buttonIconsPool,
        buttonLabelsPool,
        colorPickerBackgroundsPool,
        colorPickerContentsPool,
        settingsButtonsPool,
        bookInfoCardTransformer,
        bookInfoCardBackground,
        bookInfoCardContent,
        chapterPlaylistEntryItemPool,
        playlistNavigationButton,
        chapterPlaylistEntryNodePool,
        chunkOfVersesPool,
        versesPool
    ]
})

setTimeout(() => {
    thisBot.UpdateLinks();
}, 100)