import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";

bibleStackEventManager.emit("OnChapterDrop", {
  chapter: thisTypedBot,
  dropEvent: that,
});
