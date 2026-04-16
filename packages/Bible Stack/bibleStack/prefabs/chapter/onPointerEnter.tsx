import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.chapter.botAdapter";

bibleStackEventManager.emit("OnChapterPointerEnter", { chapter: thisTypedBot });
setTagMask(thisBot, "isPointed", true);
