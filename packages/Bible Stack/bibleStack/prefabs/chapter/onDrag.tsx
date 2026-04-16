import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";

bibleStackEventManager.emit("OnChapterDrag", {
  chapter: thisTypedBot,
  draggingEvent: that,
});

os.enableCustomDragging();
