/**
    * This tag is called when this bot is created
    * Here is made all the initial setup of the Stack manager
    * @example
    * thisBot.Initialize();
*/

if(thisBot.masks.initialized || configBot.tags.systemPortal) return;

setTagMask(thisBot, "initialized", true);
if(typeof BibleStackManager === "undefined")
{
    globalThis.BibleStackManager = thisBot;
}

setTagMask(thisBot, "areBiblePiecesDraggable", thisBot.tags.areBiblePiecesDraggable);

thisBot.vars.sectionNamesEverSelected = [];
thisBot.vars.stackBiblesData = [];
thisBot.vars.stackTestamentsData = [];
thisBot.vars.stackSectionsData = [];
thisBot.vars.stackSectionBooksData = [];
thisBot.vars.stackBooksData = [];
thisBot.vars.stackChaptersData = [];
thisBot.vars.highlightedPieces = [];
thisBot.vars.unhighlightDelaysInfo = [];
thisBot.vars.lastInteractedStackBookData = null;
thisBot.vars.lastInteractedStackSectionData = null;
thisBot.vars.lastInteractedStackTestamentData = null;
thisBot.vars.lastInteractedStackBibleData = null;
thisBot.masks.isBibleCreationActive = false;
thisBot.masks.hasStackEverBeenSpawned = false;
thisBot.masks.showBooksLabelDate = false;


const sectionShadowPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.SectionShadow,
    bot: getBot(byTag("isBaseSectionShadow", true)),
    customTags: [
        new CustomTag({name: "isBaseSectionShadow", value: false}),
        new CustomTag({name: "isSectionShadow", value: true}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.SectionShadow}),
        new CustomTag({name: "system", value: null})
    ],
    size: 8
})
const chapterPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.Chapter,
    bot: getBot(byTag("isBaseStackChapter", true)),
    customTags: [
        new CustomTag({name: "isBaseStackChapter", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BiblePieceType.StackChapter}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.Chapter}),
        new CustomTag({name: "isStackPiece", value: true}),
        new CustomTag({name: "system", value: null})
    ],
    size: 20
})
const booksPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.Book,
    bot: getBot(byTag("isBaseStackBook", true)),
    customTags: [
        new CustomTag({name: "isBaseStackBook", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BiblePieceType.StackBook}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.Book}),
        new CustomTag({name: "isStackPiece", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 20
})
const sectionsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.Section,
    bot: getBot(byTag("isBaseStackSection", true)),
    customTags: [
        new CustomTag({name: "isBaseStackSection", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BiblePieceType.StackSection}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.Section}),
        new CustomTag({name: "isStackPiece", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 8
})
const testamentsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.Testament,
    bot: getBot(byTag("isBaseStackTestament", true)),
    customTags: [
        new CustomTag({name: "isBaseStackTestament", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BiblePieceType.StackTestament}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.Testament}),
        new CustomTag({name: "isStackPiece", value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})
const bibleTransformersPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.BibleTransformer,
    bot: getBot(byTag("isBaseStackBibleTransformer", true)),
    customTags: [
        new CustomTag({name: "isBaseStackBibleTransformer", value: false}),
        new CustomTag({name: "isStackBibleTransformer", value: true}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.BibleTransformer}),
        new CustomTag({name: 'toErase', value: true}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const coversPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
    bot: getBot(byTag("isBaseStackCover", true)),
    customTags: [
        new CustomTag({name: "isBaseStackCover", value: false}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.StackCover}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const crossLinesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine,
    bot: getBot(byTag("isBaseStackCrossLine", true)),
    customTags: [
        new CustomTag({name: "isBaseStackCrossLine", value: false}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 2
})
const bibleShadowsPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleShadow,
    bot: getBot(byTag("isBaseStackShadow", true)),
    customTags: [
        new CustomTag({name: "isBaseStackShadow", value: false}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleShadow}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 1
})
const chunkOfVersesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackChunkOfVerses,
    bot: getBot(byTag("isBaseStackChunkOfVerses", true)),
    customTags: [
        new CustomTag({name: "isBaseStackChunkOfVerses", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BibleElementType.StackChunkOfVerses}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.StackChunkOfVerses}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})
const versesPool = new PoolData({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackVerse,
    bot: getBot(byTag("isBaseStackVerse", true)),
    customTags: [
        new CustomTag({name: "isBaseStackVerse", value: false}),
        new CustomTag({name: "typeOfElement", value: BibleVizUtils.Data.tags.BibleElementType.StackVerse}),
        new CustomTag({name: "poolTag", value: BibleVizUtils.Data.tags.ObjectPoolTags.StackVerse}),
        new CustomTag({name: "system", value: null}),
    ],
    size: 3
})

ObjectPooler.AddObjectPools({
    poolsData: [
        sectionShadowPool,
        chapterPool,
        booksPool,
        sectionsPool,
        testamentsPool,
        bibleTransformersPool,
        coversPool,
        crossLinesPool,
        bibleShadowsPool,
        chunkOfVersesPool,
        versesPool
    ]
})