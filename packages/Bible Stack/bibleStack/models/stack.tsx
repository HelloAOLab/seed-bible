import type {
  PieceBotTags,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

type TBiblePiece = typeof BiblePiece;

export type StackDraggablePiece = keyof Pick<
  TBiblePiece,
  | "StackBook"
  | "Verse"
  | "StackTestament"
  | "StackSectionBook"
  | "StackSection"
  | "VersesBundle"
  | "StackChapter"
>;

export interface StackDraggablePieceBotTags<
  T extends StackDraggablePiece,
> extends PieceBotTags<T> {
  draggable: boolean;
}

export interface TestamentTags extends StackDraggablePieceBotTags<"StackTestament"> {
  formOpacity: number;
  scale: number;
  color: string;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
}

export type TestamentBot = TypedBot<TestamentTags>;

export interface SectionTags extends StackDraggablePieceBotTags<"StackSection"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  strokeColor: string;
  labelOpacity: number;
  formOpacity: number;
}

export type SectionBot = TypedBot<SectionTags>;

export interface SectionShadowTags extends PieceBotTags<"StackSectionShadow"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  formOpacity: number;
  sectionName: string;
  sectionDataId: string;
}

export type SectionShadowBot = TypedBot<SectionShadowTags>;

export interface BookTags extends StackDraggablePieceBotTags<
  "StackBook" | "StackSectionBook"
> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  strokeColor: string;
  labelOpacity: number;
  formOpacity: number;
}

export type BookBot = TypedBot<BookTags>;

export type ChapterTags = StackDraggablePieceBotTags<"StackChapter">;

export interface ChapterMasks {
  color?: string;
}

export type ChapterBot = TypedBot<ChapterTags, ChapterMasks>;

export type VersesBundleTags = StackDraggablePieceBotTags<"VersesBundle">;

export type VersesBundleBot = TypedBot<VersesBundleTags>;
export type VerseBot = TypedBot<PieceBotTags<"Verse">>;

export type StackStaticPiece = keyof Pick<
  TBiblePiece,
  "StackCover" | "StackCrossLine" | "StackTransformer" | "StackShadow"
>;

export interface StackStaticPieceBotTags<
  T extends StackStaticPiece,
> extends PieceBotTags<T> {
  stackBibleId: string;
}

export interface CoverTags extends StackStaticPieceBotTags<"StackCover"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
}

export interface LowerCoverTags extends CoverTags {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  onDrag: string;
  onDragging: string;
}

export type CoverBot = TypedBot<CoverTags>;
export type LowerCoverBot = TypedBot<LowerCoverTags>;

export interface CrossLineTags extends StackStaticPieceBotTags<"StackCrossLine"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  formOpacity: number;
}

export type CrossLineBot = TypedBot<CrossLineTags>;

export type BibleTransformerTags = StackStaticPieceBotTags<"StackTransformer">;

export type BibleTransformerBot = TypedBot<BibleTransformerTags>;

export type BibleShadowTags = StackStaticPieceBotTags<"StackShadow">;

export type BibleShadowBot = TypedBot<BibleShadowTags>;
