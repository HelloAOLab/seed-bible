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
} from "bibleStack.models.stack";

export type BibleStackObjectPoolerMap = {
  StackTestament: TestamentBot;
  StackSection: SectionBot;
  StackBook: BookBot;
  StackSectionBook: BookBot;
  StackChapter: ChapterBot;
  StackSectionShadow: SectionShadowBot;
  VersesBundle: VersesBundleBot;
  Verse: VerseBot;
  Cover: CoverBot;
  CrossLine: CrossLineBot;
  StackTransformer: BibleTransformerBot;
  StackShadow: BibleShadowBot;
};
