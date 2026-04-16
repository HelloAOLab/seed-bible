import type { TypedBot } from "bibleVizUtils.models.casualos";
import type { BotTags } from "../../../../typings/AuxLibraryDefinitions";
import { BiblePiece } from "bibleVizUtils.models.canvas";

export interface TestamentBotTags extends BotTags {
  typeOfPiece: (typeof BiblePiece)["StackTestament"];
  draggable: boolean;
  isHighlighted: boolean;
}

export interface TestamentBotMasks extends BotTags {
  isBeingHovered: boolean;
}

export type TestamentBot = TypedBot<TestamentBotTags, TestamentBotMasks>;

export interface SectionBotTags extends BotTags {
  typeOfPiece: (typeof BiblePiece)["StackSection"];
  draggable: boolean;
}

export interface SectionBotMasks extends BotTags {
  isHighlighted: boolean;
  isBeingHovered: boolean;
}

export type SectionBot = TypedBot<SectionBotTags, SectionBotMasks>;

export interface BookBotTags extends BotTags {
  typeOfPiece:
    | (typeof BiblePiece)["StackBook"]
    | (typeof BiblePiece)["StackSectionBook"];
  draggable: boolean;
}

export type BookBot = TypedBot<BookBotTags>;

export interface ChapterBotTags extends BotTags {
  typeOfPiece: (typeof BiblePiece)["StackChapter"];
  draggable: boolean;
}

export type ChapterBot = TypedBot<ChapterBotTags>;

export interface ChunkOfVersesBotTags extends BotTags {
  typeOfPiece: (typeof BiblePiece)["StackChunkOfVerses"];
  draggable: boolean;
}

export interface ChunkOfVersesBotMasks extends BotTags {
  isBeingDragged: boolean;
  isSelected: boolean;
}

export type ChunkOfVersesBot = TypedBot<
  ChunkOfVersesBotTags,
  ChunkOfVersesBotMasks
>;

export interface CoverBotTags extends BotTags {
  stackBibleId: string;
}

// export interface CoverBotMasks extends BotTags {

// }

export type CoverBot = TypedBot<CoverBotTags>;

export interface CrossLineBotTags extends BotTags {
  stackBibleId: string;
}

export type CrossLineBot = TypedBot<CrossLineBotTags>;

export interface VerseBotTags extends BotTags {}

export type VerseBot = TypedBot<VerseBotTags>;
