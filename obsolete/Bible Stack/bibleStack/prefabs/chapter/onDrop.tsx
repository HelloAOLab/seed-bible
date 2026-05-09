import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";
import { chapterInteractionController } from "bibleStack.infrastructure.di.bootstrap";

chapterInteractionController?.handleChapterDrop({
  chapter: thisTypedBot,
  dropEvent: that,
});
