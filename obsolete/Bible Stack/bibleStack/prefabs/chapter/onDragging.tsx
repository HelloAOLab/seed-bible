import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";
import { chapterInteractionController } from "bibleStack.infrastructure.di.bootstrap";

chapterInteractionController?.handleChapterDragging({
  chapter: thisTypedBot,
  draggingEvent: that,
});
