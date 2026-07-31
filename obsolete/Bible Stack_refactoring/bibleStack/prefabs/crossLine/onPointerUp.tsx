import { thisTypedBot } from "bibleStack.prefabs.crossLine.botAdapter";
import { bibleStackEventManager } from "bibleStack.services.index";

bibleStackEventManager.emit("OnCrossLinePointerUp", {
  crossLine: thisTypedBot,
});
