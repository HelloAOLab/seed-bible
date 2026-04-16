import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";

bibleStackEventManager.emit("OnTestamentDrop", {
  testament: thisTypedBot,
  dropEvent: that,
});
