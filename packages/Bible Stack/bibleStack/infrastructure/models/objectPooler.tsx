import type {
  BookBot,
  ChapterBot,
  SectionBot,
  SectionShadowBot,
  TestamentBot,
  VerseBot,
  VersesBundleBot,
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
};
