import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";

bibleStackEventManager.emit("OnSectionDrag", {
  section: thisTypedBot,
  draggingEvent: that,
});
os.enableCustomDragging();
