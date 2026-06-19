import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import { ClickModalities } from "bibleVizUtils.infrastructure.models.casualos";
import { thisTypedBot } from "bibleStack.prefabs.section.botAdapter";
import { sectionInteractionController } from "bibleStack.infrastructure.di.bootstrap";

const { modality } = that;
sectionInteractionController?.handleSectionClick({
  section: thisTypedBot,
  typeOfInteraction:
    modality === ClickModalities.touch
      ? CanvasInteractions.Tap
      : CanvasInteractions.Click,
});
