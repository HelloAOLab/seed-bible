import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";

bibleStackEventManager.emit("OnSectionDrop", {
  section: thisTypedBot,
  dropEvent: that,
});
