import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";

setTagMask(thisBot, "isBeingHovered", true); // TODO: Move this to a controller or adapter and notify by a Book own event manager
bibleStackEventManager.emit("OnBookPointerEnter", {
  book: thisTypedBot,
});
