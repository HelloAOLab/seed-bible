import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";
import { bookInteractionController } from "bibleStack.infrastructure.di.bootstrap";

bookInteractionController?.handleBookDragging({
  book: thisTypedBot,
  draggingEvent: that,
});
