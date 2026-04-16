import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";

thisTypedBot.masks.isBeingHovered = true;
bibleStackEventManager.emit("OnTestamentPointerEnter", {
  testament: thisTypedBot,
});
