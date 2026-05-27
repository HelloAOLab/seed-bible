import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import { ClickModalities } from "bibleVizUtils.models.casualos";

const { modality } = that;
shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction:
    modality === ClickModalities.touch
      ? CanvasInteractions.Tap
      : CanvasInteractions.Click,
});
