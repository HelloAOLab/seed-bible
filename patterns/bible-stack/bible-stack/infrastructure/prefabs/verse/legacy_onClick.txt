import { thisTypedBot } from "bibleStack.prefabs.verse.botAdapter";
import { bibleStackEventManager } from "bibleStack.services.index";

bibleStackEventManager.emit("OnVerseClick", { verse: thisTypedBot });
