import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";

bibleStackEventManager.emit("OnBookDragging", {
  book: thisTypedBot,
  draggingEvent: that,
});
