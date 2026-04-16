import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";

bibleStackEventManager.emit("OnTestamentDrag", {
  testament: thisTypedBot,
  draggingEvent: that,
});
os.enableCustomDragging();
