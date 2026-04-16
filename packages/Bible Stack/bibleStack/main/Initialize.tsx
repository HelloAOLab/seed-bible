import { PieceDataRegistry } from "bibleVizUtils.services.PieceDataRegistry";
import {
  ObjectPoolTags,
  type BiblePieceType,
  type UnhighlightDelayInfo,
} from "bibleVizUtils.models.canvas";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";
import type { Bot, BotTags } from "../../../../typings/AuxLibraryDefinitions";
import { pieceDataRepository } from "bibleStack.services.index";
import { BufferSounds } from "bibleStack.adapters.audioAdapter";
import {
  HandleBookClick,
  HandleBookDrag,
  HandleBookDragging,
  HandleBookDrop,
  HandleBookPointerEnter,
  HandleBookPointerExit,
  HandleBookPointerUp,
} from "bibleStack.controllers.interaction.bookInteractionController";
import { bibleStackEventManager } from "bibleStack.services.index";
import {
  HandleChapterClick,
  HandleChapterDrag,
  HandleChapterDragging,
  HandleChapterDrop,
  HandleChapterPointerEnter,
  HandleChapterPointerExit,
} from "../controllers/interaction/chapterInteractionController";
import {
  HandleSectionClick,
  HandleSectionDrag,
  HandleSectionDragging,
  HandleSectionDrop,
  HandleSectionPointerEnter,
  HandleSectionPointerExit,
  HandleSectionPointerUp,
} from "bibleStack.controllers.interaction.sectionInteractionController";
import {
  HandleTestamentClick,
  HandleTestamentPointerEnter,
  HandleTestamentDrag,
  HandleTestamentDragging,
  HandleTestamentDrop,
  HandleTestamentPointerUp,
} from "bibleStack.controllers.interaction.testamentInteractionController";
import {
  HandleChunkOfVersesClick,
  HandleChunkOfVersesPointerEnter,
  HandleChunkOfVersesPointerExit,
} from "bibleStack.controllers.interaction.chunkOfVersesInteractionController";
import { HandleCoverClick } from "bibleStack.controllers.interaction.coverInteractionController";
import {
  HandleCrossLinePointerDown,
  HandleCrossLinePointerUp,
} from "bibleStack.controllers.interaction.crossLineInteractionController";
import { HandleVerseClick } from "bibleStack.controllers.interaction.verseInteractionController";

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
) {
  return;
}

let PoolData, CustomTag;
setTagMask(thisBot, "initialized", true);
globalThis.BibleStackManager = thisBot;

PieceDataRegistry.registerProvider(
  BiblePiece.StackChapter,
  pieceDataRepository.getPieceData
);

bibleStackEventManager.subscribe("OnTestamentClick", HandleTestamentClick);
bibleStackEventManager.subscribe(
  "OnTestamentPointerEnter",
  HandleTestamentPointerEnter
);
bibleStackEventManager.subscribe("OnTestamentDrag", HandleTestamentDrag);
bibleStackEventManager.subscribe(
  "OnTestamentDragging",
  HandleTestamentDragging
);
bibleStackEventManager.subscribe("OnTestamentDrop", HandleTestamentDrop);
bibleStackEventManager.subscribe(
  "OnTestamentPointerUp",
  HandleTestamentPointerUp
);

bibleStackEventManager.subscribe("OnSectionClick", HandleSectionClick);
bibleStackEventManager.subscribe("OnSectionDrag", HandleSectionDrag);
bibleStackEventManager.subscribe(
  "OnSectionPointerEnter",
  HandleSectionPointerEnter
);
bibleStackEventManager.subscribe(
  "OnSectionPointerExit",
  HandleSectionPointerExit
);
bibleStackEventManager.subscribe("OnSectionDragging", HandleSectionDragging);
bibleStackEventManager.subscribe("OnSectionDrop", HandleSectionDrop);
bibleStackEventManager.subscribe("OnSectionPointerUp", HandleSectionPointerUp);

bibleStackEventManager.subscribe("OnBookClick", HandleBookClick);
bibleStackEventManager.subscribe("OnBookDrag", HandleBookDrag);
bibleStackEventManager.subscribe("OnBookDragging", HandleBookDragging);
bibleStackEventManager.subscribe("OnBookPointerEnter", HandleBookPointerEnter);
bibleStackEventManager.subscribe("OnBookPointerEnter", HandleBookPointerExit);
bibleStackEventManager.subscribe("OnBookPointerUp", HandleBookPointerUp);
bibleStackEventManager.subscribe("OnBookDrop", HandleBookDrop);

bibleStackEventManager.subscribe("OnChapterClick", HandleChapterClick);
bibleStackEventManager.subscribe("OnChapterDrag", HandleChapterDrag);
bibleStackEventManager.subscribe("OnChapterDragging", HandleChapterDragging);
bibleStackEventManager.subscribe("OnChapterDrop", HandleChapterDrop);
bibleStackEventManager.subscribe(
  "OnChapterPointerEnter",
  HandleChapterPointerEnter
);
bibleStackEventManager.subscribe(
  "OnChapterPointerExit",
  HandleChapterPointerExit
);

bibleStackEventManager.subscribe(
  "OnChunkOfVersesClick",
  HandleChunkOfVersesClick
);
bibleStackEventManager.subscribe(
  "OnChunkOfVersesPointerEnter",
  HandleChunkOfVersesPointerEnter
);
bibleStackEventManager.subscribe(
  "OnChunkOfVersesPointerExit",
  HandleChunkOfVersesPointerExit
);

bibleStackEventManager.subscribe("OnCoverClick", HandleCoverClick);

bibleStackEventManager.subscribe(
  "OnCrossLinePointerDown",
  HandleCrossLinePointerDown
);
bibleStackEventManager.subscribe(
  "OnCrossLinePointerUp",
  HandleCrossLinePointerUp
);

bibleStackEventManager.subscribe("OnVerseClick", HandleVerseClick);

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
BufferSounds();
thisBot.vars.sectionNamesEverSelected = [];
thisBot.vars.stackBiblesData = [];
thisBot.vars.stackTestamentsData = [];
thisBot.vars.stackSectionsData = [];
thisBot.vars.stackSectionBooksData = [];
thisBot.vars.stackBooksData = [];
thisBot.vars.stackChaptersData = [];
thisBot.vars.highlightedPieces = [];
thisBot.vars.unhighlightDelaysInfo = new Map<Bot["id"], UnhighlightDelayInfo>();
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
      value: BiblePiece.StackSectionShadow,
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
      value: BiblePiece.StackChapter,
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
      value: BiblePiece.StackBook,
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
      value: BiblePiece.StackSection,
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
      value: BiblePiece.StackTestament,
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
      value: BiblePiece.StackChunkOfVerses,
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
      value: BiblePiece.StackVerse,
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
