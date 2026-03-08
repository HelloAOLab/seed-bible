import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";
import { PieceDataRepository } from "bibleStack.services.PieceDataRepository";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

/**
 * This tag is called when this bot is created
 * Here is made all the initial setup of the Stack manager
 * @example
 * thisBot.Initialize();
 */

if (
  thisBot.masks.initialized ||
  configBot.tags.systemPortal ||
  globalThis.BibleStackManager ||
  !globalThis.ObjectPooler ||
  !globalThis.BibleVizUtils ||
  !globalThis.ColorLerper
)
  return;

let PoolData, CustomTag;
setTagMask(thisBot, "initialized", true);
globalThis.BibleStackManager = thisBot;

PieceDataRegistry.registerProvider(
  ObjectPoolTags.StackChapter,
  PieceDataRepository.getPieceData
);

try {
  ({ PoolData } = await import("objectPooler.main.PoolData"));
  ({ CustomTag } = await import("objectPooler.main.CustomTag"));
} catch (err) {
  throw new Error(
    "[Debug] bibleStack.main.Initialize Could not load module",
    err
  );
}

setTagMask(
  thisBot,
  "areBiblePiecesDraggable",
  thisBot.tags.areBiblePiecesDraggable
);
thisBot.BufferSounds();
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
thisBot.vars.hasStackEverBeenSpawned = false;
thisBot.masks.showBooksLabelDate = false;
thisBot.vars.groundedChapterSelectionQueue = [];
thisBot.vars.stackedChapterSelectionQueue = [];

const sectionShadowPool = new PoolData({
  tag: ObjectPoolTags.SectionShadow,
  bot: getBot(byTag("isBaseSectionShadow", true)),
  customTags: [
    new CustomTag({ name: "isBaseSectionShadow", value: false }),
    new CustomTag({ name: "isSectionShadow", value: true }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackSectionShadow,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.SectionShadow,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 8,
});
const chapterPool = new PoolData({
  tag: ObjectPoolTags.StackChapter,
  bot: getBot(byTag("isBaseStackChapter", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackChapter", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackChapter,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackChapter,
    }),
    new CustomTag({ name: "isStackPiece", value: true }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 20,
});
const booksPool = new PoolData({
  tag: ObjectPoolTags.StackBook,
  bot: getBot(byTag("isBaseStackBook", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackBook", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackBook,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackBook,
    }),
    new CustomTag({ name: "isStackPiece", value: true }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 20,
});
const sectionsPool = new PoolData({
  tag: ObjectPoolTags.StackSection,
  bot: getBot(byTag("isBaseStackSection", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackSection", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackSection,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackSection,
    }),
    new CustomTag({ name: "isStackPiece", value: true }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 8,
});
const testamentsPool = new PoolData({
  tag: ObjectPoolTags.StackTestament,
  bot: getBot(byTag("isBaseStackTestament", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackTestament", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackTestament,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackTestament,
    }),
    new CustomTag({ name: "isStackPiece", value: true }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 2,
});
const bibleTransformersPool = new PoolData({
  tag: ObjectPoolTags.StackBibleTransformer,
  bot: getBot(byTag("isBaseStackBibleTransformer", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackBibleTransformer", value: false }),
    new CustomTag({ name: "isStackBibleTransformer", value: true }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackBibleTransformer,
    }),
    new CustomTag({ name: "toErase", value: true }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 1,
});
const coversPool = new PoolData({
  tag: ObjectPoolTags.StackCover,
  bot: getBot(byTag("isBaseStackCover", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackCover", value: false }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackCover,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 3,
});
const crossLinesPool = new PoolData({
  tag: ObjectPoolTags.StackCrossLine,
  bot: getBot(byTag("isBaseStackCrossLine", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackCrossLine", value: false }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackCrossLine,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 2,
});
const bibleShadowsPool = new PoolData({
  tag: ObjectPoolTags.StackBibleShadow,
  bot: getBot(byTag("isBaseStackShadow", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackShadow", value: false }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackBibleShadow,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 1,
});
const chunkOfVersesPool = new PoolData({
  tag: ObjectPoolTags.StackChunkOfVerses,
  bot: getBot(byTag("isBaseStackChunkOfVerses", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackChunkOfVerses", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackChunkOfVerses,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackChunkOfVerses,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 3,
});
const versesPool = new PoolData({
  tag: ObjectPoolTags.StackVerse,
  bot: getBot(byTag("isBaseStackVerse", true)),
  customTags: [
    new CustomTag({ name: "isBaseStackVerse", value: false }),
    new CustomTag({
      name: "typeOfPiece",
      value: BibleVizUtils.Data.tags.BiblePieceType.StackVerse,
    }),
    new CustomTag({
      name: "poolTag",
      value: ObjectPoolTags.StackVerse,
    }),
    new CustomTag({ name: "system", value: null }),
  ],
  size: 3,
});

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
    versesPool,
  ],
});
