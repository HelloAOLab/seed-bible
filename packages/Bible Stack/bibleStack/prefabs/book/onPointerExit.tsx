import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.book.botAdapter";

setTagMask(thisBot, "isBeingHovered", true);
bibleStackEventManager.emit("OnBookPointerExit", { book: thisTypedBot });

// InstanceManager.TryClearVideoTimeout();
if (globalThis.CLEARABLE_LERPING) {
  thisBot.TryToUnlerp();
}
