import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.cover.botAdapter";

bibleStackEventManager.emit("OnCoverClick", { cover: thisTypedBot });
