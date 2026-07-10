import type { BiblePieces } from "../../domain/models/canvas";
import type {
  ActivityIndicatorBot,
  ActivityNotificationBot,
  TypedBot,
} from "./casualos";
import type {
  BookBot,
  ChapterBot,
  CoverBot,
  CrossLineBot,
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
};

// eslint-disable-next-line
export type CustomTags<P extends TypedBot<any, any>> = Partial<P["tags"]>;

export interface PoolData<
  K = string,
  // eslint-disable-next-line
  P extends TypedBot<any, any> = TypedBot<any, any>,
> {
  key: K;
  prefab: P;
  customTags: CustomTags<P>;
  cleanupCustomTags?: CustomTags<P>;
  size: number;
}

export interface Pool<
  K = string,
  // eslint-disable-next-line
  P extends TypedBot<any, any> = TypedBot<any, any>,
> {
  poolData: PoolData<K, P>;
  objectPool: P[];
  inUseObjects: P[];
}
