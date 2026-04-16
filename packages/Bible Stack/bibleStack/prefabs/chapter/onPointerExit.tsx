import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";

bibleStackEventManager.emit("OnChapterPointerExit", { chapter: thisTypedBot });
setTagMask(thisBot, "isPointed", false);
