import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";

bibleStackEventManager.emit("OnBookDrop", {
  book: thisTypedBot,
  dropEvent: that,
});
