import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";

bibleStackEventManager.emit("OnBookDrag", {
  book: thisTypedBot,
  draggingEvent: that,
});
os.enableCustomDragging();
