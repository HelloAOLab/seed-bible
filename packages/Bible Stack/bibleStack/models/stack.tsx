import type {
  PieceBotTags,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

type TBiblePiece = typeof BiblePiece;

export type StackDraggablePiece = keyof Pick<
  TBiblePiece,
  | "StackBook"
  | "StackVerse"
  | "StackTestament"
  | "StackSectionBook"
  | "StackSection"
  | "StackChunkOfVerses"
  | "StackChapter"
>;

export interface StackDraggablePieceBotTags<
  T extends StackDraggablePiece,
> extends PieceBotTags<T> {
  draggable: boolean;
}

export type TestamentTags = StackDraggablePieceBotTags<"StackTestament">;

export type TestamentBot = TypedBot<TestamentTags>;

export type SectionTags = StackDraggablePieceBotTags<"StackSection">;

export type SectionBot = TypedBot<SectionTags>;

export type BookTags = StackDraggablePieceBotTags<
  "StackBook" | "StackSectionBook"
>;

export type BookBot = TypedBot<BookTags>;

export type ChapterTags = StackDraggablePieceBotTags<"StackChapter">;

export type ChapterBot = TypedBot<ChapterTags>;

export type ChunkOfVersesTags =
  StackDraggablePieceBotTags<"StackChunkOfVerses">;

export type ChunkOfVersesBot = TypedBot<ChunkOfVersesTags>;
export type VerseBot = TypedBot<PieceBotTags<"StackVerse">>;

export type StackStaticPiece = keyof Pick<
  TBiblePiece,
  "StackCover" | "StackCrossLine"
>;

export interface StackStaticPieceBotTags<
  T extends StackStaticPiece,
> extends PieceBotTags<T> {
  stackBibleId: string;
}

export interface CoverTags extends StackStaticPieceBotTags<"StackCover"> {}

export type CoverBot = TypedBot<CoverTags>;

export interface CrossLineTags extends StackStaticPieceBotTags<"StackCrossLine"> {}

export type CrossLineBot = TypedBot<CrossLineTags>;
