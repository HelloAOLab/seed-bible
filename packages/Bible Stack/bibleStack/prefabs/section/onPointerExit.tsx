import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";

thisTypedBot.masks.isBeingHovered = false;
bibleStackEventManager.emit("OnSectionPointerExit", {
  section: thisTypedBot,
});
