import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import { ClickModalities } from "bibleVizUtils.models.casualos";
import { bibleStackEventManager } from "bibleStack.services.index";
import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";

const { modality } = that;
bibleStackEventManager.emit("OnTestamentClick", {
  testament: thisTypedBot,
  typeOfInteraction:
    modality === ClickModalities.touch
      ? CanvasInteractions.Tap
      : CanvasInteractions.Click,
});
