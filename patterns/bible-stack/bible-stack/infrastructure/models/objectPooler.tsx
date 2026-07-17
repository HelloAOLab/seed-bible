import type { BiblePieces } from "../../domain/models/canvas";
import type { BotListenerParametersMap, PieceBot, TypedBot } from "./casualos";
import type {
  ActivityIndicatorBot,
  ActivityNotificationBot,
  BookBot,
  ChapterBot,
  CoverBot,
  CrossLineBot,
  InfoLabelDateBot,
  InfoLabelTailBot,
  InfoLabelTextBot,
  InfoLabelTransformerBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
  BibleTransformerBot,
  BibleShadowBot,
} from "./stack";

export type BibleStackObjectPoolerMap = {
  StackTestament: TestamentBot;
  StackSection: SectionBot;
  StackBook: BookBot;
  StackSectionBook: BookBot;
  StackChapter: ChapterBot;
  StackSectionShadow: SectionShadowBot;
  VersesBundle: VersesBundleBot;
  Verse: VerseBot;
  StackCover: CoverBot;
  StackCrossLine: CrossLineBot;
  StackTransformer: BibleTransformerBot;
  StackShadow: BibleShadowBot;
  [BiblePieces.ActivityIndicator]: ActivityIndicatorBot;
  [BiblePieces.ActivityNotification]: ActivityNotificationBot;
  [BiblePieces.InfoLabelDate]: InfoLabelDateBot;
  [BiblePieces.InfoLabelTail]: InfoLabelTailBot;
  [BiblePieces.InfoLabelText]: InfoLabelTextBot;
  [BiblePieces.InfoLabelTransformer]: InfoLabelTransformerBot;
};

// eslint-disable-next-line
export type CustomTags<P extends TypedBot<any, any>> = Partial<P["tags"]>;

/**
 * Listeners the pooler attaches to every object it creates for a pool, keyed by
 * tag name. Generic on the concrete bot type `B`, so each callback receives the
 * piece's specific `bot` and `params` (e.g. `TestamentBot` and its tag-key set),
 * not the widened `PieceBot`.
 */
export type PieceListeners<B extends PieceBot> = {
  [K in keyof BotListenerParametersMap<B>]?: (
    params: BotListenerParametersMap<B>[K],
    bot: B
  ) => void;
};

export interface PoolData<K = string, P extends PieceBot = PieceBot> {
  key: K;
  prefab: P;
  customTags: CustomTags<P>;
  cleanupCustomTags?: CustomTags<P>;
  listeners?: PieceListeners<P>;
  size: number;
}

export interface Pool<K = string, P extends PieceBot = PieceBot> {
  poolData: PoolData<K, P>;
  objectPool: P[];
  inUseObjects: P[];
}
