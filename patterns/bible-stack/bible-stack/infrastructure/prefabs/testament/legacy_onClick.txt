import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import { ClickModalities } from "bibleVizUtils.infrastructure.models.casualos";
import { thisTypedBot } from "bibleStack.prefabs.testament.botAdapter";
import { testamentInteractionController } from "bibleStack.infrastructure.di.bootstrap";

const { modality } = that;
testamentInteractionController?.handleTestamentClick({
  testament: thisTypedBot,
  interaction:
    modality === ClickModalities.touch
      ? CanvasInteractions.Tap
      : CanvasInteractions.Click,
});
