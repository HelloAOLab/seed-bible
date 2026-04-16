import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";

setTagMask(thisBot, "isBeingHovered", true);
bibleStackEventManager.emit("OnSectionPointerEnter", {
  section: thisTypedBot,
});
