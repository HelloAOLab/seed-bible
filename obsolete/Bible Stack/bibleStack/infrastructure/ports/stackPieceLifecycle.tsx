import type {
  BibleShadowBot as StackShadowBot,
  BibleTransformerBot,
  BookBot,
  ChapterBot,
  CoverBot,
  LowerCoverBot,
  CrossLineBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
} from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type {
  PieceBotTags,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";
import type { BibleStackObjectPoolerMap } from "bibleStack.infrastructure.models.objectPooler";
import type {
  StackCover,
  StackCrossLine,
  StackShadow,
  StackTransformer,
} from "bibleStack.domain.models.pieces";

export interface ObjectPoolerPort<
  P extends Record<keyof P, TypedBot<PieceBotTags>>,
> {
  getObject: <K extends keyof P>(key: K) => P[K];
  releaseObject: <K extends keyof P>(obj: P[K], key: K) => void;
}

export interface StackTestamentMapperPort {
  toDomain: (bot: TestamentBot) => Piece<"StackTestament">;
  toInfrastructure: (
    piece: Piece<"StackTestament">
  ) => TestamentBot | undefined;
}

export interface StackSectionMapperPort {
  toDomain: (bot: SectionBot) => Piece<"StackSection">;
  toInfrastructure: (piece: Piece<"StackSection">) => SectionBot | undefined;
}

export interface StackBookMapperPort {
  toDomain: (bot: BookBot) => Piece<"StackBook" | "StackSectionBook">;
  toInfrastructure: (piece: Piece<"StackBook">) => BookBot | undefined;
}

export interface StackChapterMapperPort {
  toDomain: (bot: ChapterBot) => Piece<"StackChapter">;
  toInfrastructure: (piece: Piece<"StackChapter">) => ChapterBot | undefined;
}

export interface StackSectionShadowMapperPort {
  toDomain: (bot: SectionShadowBot) => Piece<"StackSectionShadow">;
  toInfrastructure: (
    piece: Piece<"StackSectionShadow">
  ) => SectionShadowBot | undefined;
}

export interface StackSectionBookMapperPort {
  toDomain: (bot: BookBot) => Piece<"StackSectionBook">;
  toInfrastructure: (piece: Piece<"StackSectionBook">) => BookBot | undefined;
}

export interface StackVersesBundleMapperPort {
  toDomain: (bot: VersesBundleBot) => Piece<"VersesBundle">;
  toInfrastructure: (
    piece: Piece<"VersesBundle">
  ) => VersesBundleBot | undefined;
}

export interface StackVerseMapperPort {
  toDomain: (bot: VerseBot) => Piece<"Verse">;
  toInfrastructure: (piece: Piece<"Verse">) => VerseBot | undefined;
}

export interface StackTransformerMapperPort {
  toDomain: (bot: BibleTransformerBot) => StackTransformer;
  toInfrastructure: (
    piece: StackTransformer
  ) => BibleTransformerBot | undefined;
}

export interface StackCoverMapperPort {
  toDomain: (bot: CoverBot) => StackCover;
  toInfrastructure: (piece: StackCover) => CoverBot | undefined;
}

export interface StackLowerCoverMapperPort {
  toDomain: (bot: LowerCoverBot) => StackCover;
  toInfrastructure: (piece: StackCover) => LowerCoverBot | undefined;
}

export interface StackCrossLineMapperPort {
  toDomain: (bot: CrossLineBot) => StackCrossLine;
  toInfrastructure: (piece: StackCrossLine) => CrossLineBot | undefined;
}

export interface StackShadowMapperPort {
  toDomain: (bot: StackShadowBot) => StackShadow;
  toInfrastructure: (piece: StackShadow) => StackShadowBot | undefined;
}

export interface StackPieceLifecycleAdapterParams {
  objectPoolerPort: ObjectPoolerPort<BibleStackObjectPoolerMap>;
  testamentMapperPort: StackTestamentMapperPort;
  sectionMapperPort: StackSectionMapperPort;
  bookMapperPort: StackBookMapperPort;
  chapterMapperPort: StackChapterMapperPort;
  sectionShadowMapperPort: StackSectionShadowMapperPort;
  sectionBookMapperPort: StackSectionBookMapperPort;
  versesBundleMapperPort: StackVersesBundleMapperPort;
  verseMapperPort: StackVerseMapperPort;
  stackTransformerMapperPort: StackTransformerMapperPort;
  coverMapperPort: StackCoverMapperPort;
  crossLineMapperPort: StackCrossLineMapperPort;
  stackShadowMapperPort: StackShadowMapperPort;
}
