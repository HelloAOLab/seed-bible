import type {
  BookBot,
  ChapterBot,
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
}
