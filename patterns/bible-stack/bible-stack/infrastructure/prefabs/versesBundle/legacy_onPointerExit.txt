import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.chunkOfVerses.botAdapter";

bibleStackEventManager.emit("OnChunkOfVersesPointerExit", {
  chunkOfVerses: thisTypedBot,
});
